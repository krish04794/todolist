const API_URL = "https://your-render-service.onrender.com/tasks";

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();

        const tasksContainer = document.getElementById("tasks");
        tasksContainer.innerHTML = "";

        tasks.forEach(task => {
            const taskCard = document.createElement("div");
            taskCard.className = task.is_completed ? "task-card completed" : "task-card";

            taskCard.innerHTML = `
                <h3>${task.title}</h3>
                <p>${task.description || "No description"}</p>
                <p><strong>Status:</strong> ${task.is_completed ? "Completed" : "Pending"}</p>
                <div class="task-actions">
                    <button class="complete-btn" onclick="toggleTask(${task.id}, ${task.is_completed})">
                        ${task.is_completed ? "Mark Pending" : "Mark Complete"}
                    </button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            `;

            tasksContainer.appendChild(taskCard);
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}

async function addTask() {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!title) {
        alert("Title is required");
        return;
    }

    const newTask = {
        title: title,
        description: description
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newTask)
        });

        if (response.ok) {
            document.getElementById("title").value = "";
            document.getElementById("description").value = "";
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
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                is_completed: !currentStatus
            })
        });

        if (response.ok) {
            fetchTasks();
        } else {
            alert("Failed to update task");
        }
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            fetchTasks();
        } else {
            alert("Failed to delete task");
        }
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}




window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

fetchTasks();