const API_BASE = "http://127.0.0.1:8000"; // Use this for local testing
// const API_BASE = "https://todolist-yrxb.onrender.com"; // Use this for production

let token = localStorage.getItem("token") || null;
let currentTasks = [];
let currentFilter = 'all';

// UI State Management
function toggleAuthView(view) {
    if (view === 'login') {
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('auth-title').innerText = 'Welcome Back';
    } else {
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('signup-view').classList.remove('hidden');
        document.getElementById('auth-title').innerText = 'Create an Account';
    }
}

function updateUI() {
    if (token) {
        document.getElementById('auth-wrapper').classList.add('hidden');
        document.getElementById('dashboard-wrapper').classList.remove('hidden');
        fetchTasks();
    } else {
        document.getElementById('auth-wrapper').classList.remove('hidden');
        document.getElementById('dashboard-wrapper').classList.add('hidden');
    }
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            token = data.access_token;
            localStorage.setItem("token", token);
            updateUI();
        } else {
            const error = await response.json();
            alert(error.detail || "Login failed");
        }
    } catch (err) {
        console.error("Login error", err);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    try {
        const response = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (response.ok) {
            alert("Signup successful! Please log in.");
            toggleAuthView('login');
        } else {
            const error = await response.json();
            alert(error.detail || "Signup failed");
        }
    } catch (err) {
        console.error("Signup error", err);
    }
}

function handleLogout() {
    token = null;
    localStorage.removeItem("token");
    updateUI();
}

// API Requests with Auth
async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, options);
    if (response.status === 401) {
        handleLogout();
        alert("Session expired. Please log in again.");
        throw new Error("Unauthorized");
    }
    return response;
}

// Modal Logic
function openModal() {
    document.getElementById("task-modal").classList.remove("hidden");
    document.getElementById("add-task-form").reset();
}

function closeModal() {
    document.getElementById("task-modal").classList.add("hidden");
}

// Task Management
async function fetchTasks() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/tasks`);
        currentTasks = await response.json();
        updateDashboard();
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}

function updateDashboard() {
    // Update Metrics
    const total = currentTasks.length;
    const completed = currentTasks.filter(t => t.is_completed).length;
    const pending = total - completed;
    
    let overdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    currentTasks.forEach(t => {
        if (!t.is_completed && t.due_date) {
            const dueDate = new Date(t.due_date);
            if (dueDate < today) overdue++;
        }
    });

    document.getElementById("count-total").innerText = total;
    document.getElementById("count-completed").innerText = completed;
    document.getElementById("count-pending").innerText = pending;
    document.getElementById("count-overdue").innerText = overdue;

    renderTasks();
}

function filterTasks(filterType) {
    currentFilter = filterType;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    const titles = {
        'all': 'All Tasks',
        'completed': 'Completed Tasks',
        'pending': 'Pending Tasks',
        'work': 'Work Category',
        'personal': 'Personal Category'
    };
    document.getElementById("section-title").innerText = titles[filterType] || 'Tasks';
    renderTasks();
}

function searchTasks() {
    renderTasks();
}

function renderTasks() {
    const searchQuery = document.getElementById("search-input").value.toLowerCase();
    const tasksContainer = document.getElementById("tasks");
    tasksContainer.innerHTML = "";

    let filtered = currentTasks.filter(t => t.title.toLowerCase().includes(searchQuery));

    if (currentFilter === 'completed') filtered = filtered.filter(t => t.is_completed);
    else if (currentFilter === 'pending') filtered = filtered.filter(t => !t.is_completed);
    else if (currentFilter === 'work') filtered = filtered.filter(t => t.category.toLowerCase() === 'work');
    else if (currentFilter === 'personal') filtered = filtered.filter(t => t.category.toLowerCase() === 'personal');

    filtered.forEach(task => {
        const dateStr = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date';
        const badgeClass = task.priority === 'High' ? 'badge-high' : (task.priority === 'Medium' ? 'badge-medium' : 'badge-low');
        
        const taskEl = document.createElement("div");
        taskEl.className = `task-item ${task.is_completed ? 'completed' : ''}`;
        taskEl.innerHTML = `
            <div class="task-left">
                <input type="checkbox" class="task-checkbox" ${task.is_completed ? 'checked' : ''} onchange="toggleTask(${task.id}, ${task.is_completed})">
                <div class="task-details">
                    <span class="task-title">${task.title}</span>
                    <span class="task-meta">
                        <i class="fa-regular fa-calendar"></i> ${dateStr} &bull; <i class="fa-solid fa-folder"></i> ${task.category || 'General'}
                    </span>
                </div>
            </div>
            <div class="task-right">
                <span class="badge ${badgeClass}">${task.priority || 'Medium'}</span>
                <div class="task-actions">
                    <button class="delete-btn" onclick="deleteTask(${task.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        tasksContainer.appendChild(taskEl);
    });
}

async function addTask(e) {
    e.preventDefault();
    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-desc").value.trim();
    const due_date = document.getElementById("task-due-date").value;
    const priority = document.getElementById("task-priority").value;
    const category = document.getElementById("task-category").value;

    try {
        const response = await fetchWithAuth(`${API_BASE}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                title, 
                description: description || null,
                due_date: due_date ? new Date(due_date).toISOString() : null,
                priority,
                category
            })
        });

        if (response.ok) {
            closeModal();
            fetchTasks();
        } else {
            alert("Failed to add task");
        }
    } catch (error) {
        console.error("Error adding task:", error);
    }
}

async function toggleTask(taskId, currentStatus) {
    try {
        const response = await fetchWithAuth(`${API_BASE}/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_completed: !currentStatus })
        });

        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
        const response = await fetchWithAuth(`${API_BASE}/tasks/${taskId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

// Global exposure
window.toggleAuthView = toggleAuthView;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.openModal = openModal;
window.closeModal = closeModal;
window.filterTasks = filterTasks;
window.searchTasks = searchTasks;

<<<<<<< HEAD
// Init
updateUI();
=======
fetchTasks();
>>>>>>> 9ff04cb2b830a3ee1ef7b52c1fe4565d671abd48
