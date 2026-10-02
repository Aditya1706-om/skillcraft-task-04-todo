/* ==========================================================================
   TASKMASTER PRO — ULTRA LUXURY TO-DO APP LOGIC
   Features: Glassmorphism UI, Web Audio Effects, Confetti Celebrations,
   Priority & Tagging, Smart Due Dates, Custom Modal & Toasts, LocalStorage
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. DOM ELEMENTS
   -------------------------------------------------------------------------- */
const taskInput = document.getElementById("task-input");
const taskDate = document.getElementById("task-date");
const taskTime = document.getElementById("task-time");
const addTaskBtn = document.getElementById("add-task-btn");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const emptyFocusBtn = document.getElementById("empty-focus-btn");

const filterButtons = document.querySelectorAll(".filter-btn");
const badgeAll = document.getElementById("badge-all");
const badgePending = document.getElementById("badge-pending");
const badgeCompleted = document.getElementById("badge-completed");

const totalCount = document.getElementById("total-count");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");

const progressFill = document.getElementById("progress-fill");
const progressPercentage = document.getElementById("progress-percentage");
const progressCaption = document.getElementById("progress-caption");

const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const sortSelect = document.getElementById("sort-select");
const clearCompletedBtn = document.getElementById("clear-completed-btn");

const currentDateTimeEl = document.getElementById("current-datetime");
const greetingTextEl = document.getElementById("greeting-text");

const soundToggleBtn = document.getElementById("sound-toggle-btn");
const soundIcon = document.getElementById("sound-icon");
const themeToggleBtn = document.getElementById("theme-toggle-btn");

const priorityChips = document.querySelectorAll(".priority-chip");
const categoryChips = document.querySelectorAll(".cat-chip");
const btnQuickToday = document.getElementById("btn-quick-today");
const btnQuickTomorrow = document.getElementById("btn-quick-tomorrow");

const confirmModal = document.getElementById("confirm-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmBtn = document.getElementById("modal-confirm-btn");

const toastContainer = document.getElementById("toast-container");
const confettiCanvas = document.getElementById("confetti-canvas");

/* --------------------------------------------------------------------------
   2. APPLICATION STATE
   -------------------------------------------------------------------------- */
let tasks = [];
let currentFilter = "all";
let currentSearch = "";
let currentSort = "newest";
let editingTaskId = null;

let selectedPriority = "medium";
let selectedCategory = "General";
let soundEnabled = true;
const themes = ["dark", "aurora", "violet"];
let currentThemeIndex = 0;

/* --------------------------------------------------------------------------
   3. SYNTHESIZED SOUND SYSTEM (ZERO DEPENDENCIES)
   -------------------------------------------------------------------------- */
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "add") {
            // Cheerful uplifting pop
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === "complete") {
            // Melodic accomplishment double-chime
            osc.type = "triangle";
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === "delete") {
            // Soft descend whoosh
            osc.type = "sine";
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.start(now);
            osc.stop(now + 0.17);
        } else if (type === "warning") {
            // Subtle double blip
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.19);
        }
    } catch (e) {
        console.warn("Audio playback not supported or blocked", e);
    }
}

/* --------------------------------------------------------------------------
   4. TOAST NOTIFICATIONS
   -------------------------------------------------------------------------- */
function showToast(message, type = "success", icon = "✨") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

/* --------------------------------------------------------------------------
   5. CUSTOM PROMISE-BASED MODAL
   -------------------------------------------------------------------------- */
let modalResolver = null;

function showConfirmModal(title, message, confirmText = "Delete") {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirmBtn.textContent = confirmText;
    confirmModal.style.display = "flex";

    return new Promise((resolve) => {
        modalResolver = resolve;
    });
}

function closeConfirmModal(result) {
    confirmModal.style.display = "none";
    if (modalResolver) {
        modalResolver(result);
        modalResolver = null;
    }
}

modalCancelBtn.addEventListener("click", () => closeConfirmModal(false));
modalConfirmBtn.addEventListener("click", () => closeConfirmModal(true));
confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal(false);
});

/* --------------------------------------------------------------------------
   6. CELEBRATION CONFETTI ENGINE
   -------------------------------------------------------------------------- */
function launchConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext("2d");
    const width = confettiCanvas.width = window.innerWidth;
    const height = confettiCanvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#00f0ff", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#ffffff"];

    for (let i = 0; i < 75; i++) {
        particles.push({
            x: width * 0.5 + (Math.random() * 200 - 100),
            y: height * 0.45,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() * -12) - 4,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }

    let animationFrame;
    function render() {
        ctx.clearRect(0, 0, width, height);
        let active = false;

        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35; // gravity
            p.rotation += p.rotSpeed;
            p.opacity -= 0.012;

            if (p.opacity > 0) {
                active = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
                ctx.restore();
            }
        });

        if (active) {
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, width, height);
            cancelAnimationFrame(animationFrame);
        }
    }

    render();
}

window.addEventListener("resize", () => {
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
});

/* --------------------------------------------------------------------------
   7. LIVE GREETING & CLOCK
   -------------------------------------------------------------------------- */
function updateDateTime() {
    const now = new Date();
    
    // Greeting
    const hour = now.getHours();
    let greeting = "Welcome back 👋";
    if (hour >= 5 && hour < 12) {
        greeting = "Good Morning, Om Aditya ☀️";
    } else if (hour >= 12 && hour < 17) {
        greeting = "Good Afternoon, Om Aditya 🌤️";
    } else if (hour >= 17 && hour < 22) {
        greeting = "Good Evening, Om Aditya 🌆";
    } else {
        greeting = "Burning the midnight oil, Om Aditya 🌙";
    }
    greetingTextEl.textContent = greeting;

    // Date & Time String
    const options = {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    };
    currentDateTimeEl.textContent = now.toLocaleDateString("en-IN", options);
}

setInterval(updateDateTime, 1000);
updateDateTime();

/* --------------------------------------------------------------------------
   8. LOCAL STORAGE MANAGEMENT
   -------------------------------------------------------------------------- */
function loadTasks() {
    const savedTasks = localStorage.getItem("skillcraftTasks");
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
            // Backfill missing fields for backward compatibility
            tasks.forEach((task) => {
                if (!task.priority) task.priority = "medium";
                if (!task.category) task.category = "General";
                if (!task.createdAt) task.createdAt = task.id || Date.now();
            });
        } catch (error) {
            console.error("Failed to parse stored tasks:", error);
            tasks = [];
        }
    }

    // Load Sound Preference
    const savedSound = localStorage.getItem("taskSoundEnabled");
    if (savedSound !== null) {
        soundEnabled = savedSound === "true";
        soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
    }

    // Load Theme
    const savedTheme = localStorage.getItem("taskTheme");
    if (savedTheme && themes.includes(savedTheme)) {
        document.documentElement.setAttribute("data-theme", savedTheme);
        currentThemeIndex = themes.indexOf(savedTheme);
    }

    renderTasks();
}

function saveTasks() {
    localStorage.setItem("skillcraftTasks", JSON.stringify(tasks));
}

/* --------------------------------------------------------------------------
   9. QUICK DATE SHORTCUTS
   -------------------------------------------------------------------------- */
function setInputDate(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    taskDate.value = `${yyyy}-${mm}-${dd}`;
    taskDate.focus();
}

btnQuickToday.addEventListener("click", () => setInputDate(0));
btnQuickTomorrow.addEventListener("click", () => setInputDate(1));

/* --------------------------------------------------------------------------
   10. PRIORITY & CATEGORY SELECTION HANDLERS
   -------------------------------------------------------------------------- */
priorityChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        priorityChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        selectedPriority = chip.getAttribute("data-priority");
    });
});

categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
        categoryChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        selectedCategory = chip.getAttribute("data-cat");
    });
});

/* --------------------------------------------------------------------------
   11. ADD & UPDATE TASK LOGIC
   -------------------------------------------------------------------------- */
function addTask() {
    const title = taskInput.value.trim();

    if (title === "") {
        playSound("warning");
        showToast("Please enter a task title.", "danger", "⚠️");
        taskInput.focus();
        return;
    }

    /* EDIT EXISTING TASK */
    if (editingTaskId !== null) {
        const task = tasks.find((item) => item.id === editingTaskId);

        if (task) {
            task.title = title;
            task.date = taskDate.value;
            task.time = taskTime.value;
            task.priority = selectedPriority;
            task.category = selectedCategory;
        }

        editingTaskId = null;
        addTaskBtn.innerHTML = `<span class="btn-icon">+</span><span class="btn-text">Add Task</span>`;
        addTaskBtn.style.background = "";
        playSound("add");
        showToast("Task updated successfully!", "success", "✏️");
    }
    /* ADD NEW TASK */
    else {
        const newTask = {
            id: Date.now(),
            title: title,
            date: taskDate.value,
            time: taskTime.value,
            priority: selectedPriority,
            category: selectedCategory,
            completed: false,
            createdAt: Date.now()
        };

        tasks.unshift(newTask);
        playSound("add");
        showToast("Task created successfully!", "success", "✨");
    }

    saveTasks();
    clearInputs();
    renderTasks();
}

function clearInputs() {
    taskInput.value = "";
    taskDate.value = "";
    taskTime.value = "";

    // Reset default priority and category
    priorityChips.forEach((c) => {
        c.classList.toggle("active", c.getAttribute("data-priority") === "medium");
    });
    selectedPriority = "medium";

    categoryChips.forEach((c) => {
        c.classList.toggle("active", c.getAttribute("data-cat") === "General");
    });
    selectedCategory = "General";
}

/* --------------------------------------------------------------------------
   12. RENDER TASKS & STATS
   -------------------------------------------------------------------------- */
function renderTasks() {
    taskList.innerHTML = "";

    /* FILTER TASKS */
    let filteredTasks = tasks.filter((task) => {
        if (currentFilter === "pending" && task.completed) return false;
        if (currentFilter === "completed" && !task.completed) return false;

        // Search Filter
        if (currentSearch) {
            const query = currentSearch.toLowerCase();
            const matchTitle = task.title.toLowerCase().includes(query);
            const matchCategory = (task.category || "").toLowerCase().includes(query);
            return matchTitle || matchCategory;
        }
        return true;
    });

    /* SORT TASKS */
    filteredTasks.sort((a, b) => {
        if (currentSort === "newest") {
            return (b.createdAt || b.id) - (a.createdAt || a.id);
        }
        if (currentSort === "oldest") {
            return (a.createdAt || a.id) - (b.createdAt || b.id);
        }
        if (currentSort === "priority") {
            const weight = { high: 3, medium: 2, low: 1 };
            return (weight[b.priority] || 2) - (weight[a.priority] || 2);
        }
        if (currentSort === "date") {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        }
        if (currentSort === "alphabetical") {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });

    /* EMPTY STATE */
    if (filteredTasks.length === 0) {
        emptyState.style.display = "flex";
        const emptyH2 = emptyState.querySelector("h2");
        const emptyP = emptyState.querySelector("p");

        if (currentSearch) {
            emptyH2.textContent = "No matching tasks found";
            emptyP.textContent = `No tasks matching "${currentSearch}". Try a different keyword!`;
            emptyFocusBtn.style.display = "none";
        } else if (tasks.length === 0) {
            emptyH2.textContent = "No tasks yet";
            emptyP.textContent = "Add your first task above to kickstart your productive day!";
            emptyFocusBtn.style.display = "inline-block";
        } else if (currentFilter === "pending") {
            emptyH2.textContent = "You're all caught up! 🎉";
            emptyP.textContent = "No pending tasks remaining. Great job!";
            emptyFocusBtn.style.display = "none";
        } else if (currentFilter === "completed") {
            emptyH2.textContent = "No completed tasks yet";
            emptyP.textContent = "Check off tasks once you finish them to build momentum!";
            emptyFocusBtn.style.display = "none";
        }
    } else {
        emptyState.style.display = "none";
    }

    /* RENDER TASK CARDS */
    filteredTasks.forEach((task) => {
        const taskItem = document.createElement("div");
        taskItem.className = "task-item";
        taskItem.setAttribute("data-priority", task.priority || "medium");
        taskItem.setAttribute("data-id", task.id);

        if (task.completed) {
            taskItem.classList.add("completed");
        }

        /* CHECKBOX CONTAINER */
        const checkboxContainer = document.createElement("label");
        checkboxContainer.className = "checkbox-container";
        checkboxContainer.title = task.completed ? "Mark as Pending" : "Mark as Completed";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;

        const checkMark = document.createElement("span");
        checkMark.className = "checkbox-custom-mark";
        checkMark.textContent = "✓";

        checkbox.addEventListener("change", () => {
            toggleTask(task.id);
        });

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(checkMark);

        /* TASK CONTENT */
        const taskContent = document.createElement("div");
        taskContent.className = "task-content";

        // Title Row
        const titleRow = document.createElement("div");
        titleRow.className = "task-title-row";

        const taskTitle = document.createElement("span");
        taskTitle.className = "task-title";
        taskTitle.textContent = task.title;

        // Category Tag
        if (task.category) {
            const catBadge = document.createElement("span");
            catBadge.className = "task-category-badge";
            catBadge.textContent = task.category;
            titleRow.appendChild(catBadge);
        }

        // Priority Tag
        const priorityBadge = document.createElement("span");
        priorityBadge.className = `task-priority-badge badge-p-${task.priority || "medium"}`;
        priorityBadge.textContent = (task.priority || "medium").toUpperCase();
        titleRow.appendChild(priorityBadge);

        titleRow.appendChild(taskTitle);
        taskContent.appendChild(titleRow);

        // Schedule Row (Date, Time, Due Badges)
        if (task.date || task.time) {
            const schedule = document.createElement("div");
            schedule.className = "task-schedule";

            if (task.date) {
                // Due status relative logic
                const dueStatus = getDueStatus(task.date);
                if (dueStatus && !task.completed) {
                    const statusBadge = document.createElement("span");
                    statusBadge.className = dueStatus.className;
                    statusBadge.textContent = dueStatus.label;
                    schedule.appendChild(statusBadge);
                }

                const dateItem = document.createElement("span");
                dateItem.className = "schedule-item";
                dateItem.innerHTML = `📅 <span>${formatDate(task.date)}</span>`;
                schedule.appendChild(dateItem);
            }

            if (task.time) {
                const timeItem = document.createElement("span");
                timeItem.className = "schedule-item";
                timeItem.innerHTML = `⏰ <span>${formatTime(task.time)}</span>`;
                schedule.appendChild(timeItem);
            }

            taskContent.appendChild(schedule);
        }

        /* ACTIONS (EDIT & DELETE) */
        const actions = document.createElement("div");
        actions.className = "task-actions";

        // Edit Button
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "action-btn edit-btn";
        editBtn.title = "Edit Task";
        editBtn.setAttribute("aria-label", "Edit Task");
        editBtn.innerHTML = "✏️";
        editBtn.addEventListener("click", () => editTask(task.id));

        // Delete Button
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "action-btn delete-btn";
        deleteBtn.title = "Delete Task";
        deleteBtn.setAttribute("aria-label", "Delete Task");
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.addEventListener("click", () => deleteTask(task.id));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        // Assemble Item
        taskItem.appendChild(checkboxContainer);
        taskItem.appendChild(taskContent);
        taskItem.appendChild(actions);

        taskList.appendChild(taskItem);
    });

    updateStatistics();
}

/* --------------------------------------------------------------------------
   13. DUE DATE RELATIVE HELPER
   -------------------------------------------------------------------------- */
function getDueStatus(dateString) {
    if (!dateString) return null;
    const taskDateObj = new Date(dateString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round((taskDateObj - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: "⚠️ Overdue", className: "badge-overdue" };
    } else if (diffDays === 0) {
        return { label: "⚡ Due Today", className: "badge-due-today" };
    } else if (diffDays === 1) {
        return { label: "Tomorrow", className: "badge-due-today" };
    }
    return null;
}

/* --------------------------------------------------------------------------
   14. FORMAT DATE & TIME HELPERS
   -------------------------------------------------------------------------- */
function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(timeString) {
    const parts = timeString.split(":");
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${period}`;
}

/* --------------------------------------------------------------------------
   15. TOGGLE TASK COMPLETION
   -------------------------------------------------------------------------- */
function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        playSound("complete");
        launchConfetti();
        showToast("Task completed! Keep it up!", "success", "🎉");
    } else {
        playSound("add");
    }

    saveTasks();
    renderTasks();
}

/* --------------------------------------------------------------------------
   16. EDIT TASK
   -------------------------------------------------------------------------- */
function editTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    taskInput.value = task.title;
    taskDate.value = task.date || "";
    taskTime.value = task.time || "";

    // Set Priority Chip
    selectedPriority = task.priority || "medium";
    priorityChips.forEach((chip) => {
        chip.classList.toggle("active", chip.getAttribute("data-priority") === selectedPriority);
    });

    // Set Category Chip
    selectedCategory = task.category || "General";
    categoryChips.forEach((chip) => {
        chip.classList.toggle("active", chip.getAttribute("data-cat") === selectedCategory);
    });

    editingTaskId = id;
    addTaskBtn.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">Update Task</span>`;
    addTaskBtn.style.background = "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)";

    taskInput.focus();
    taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Editing task: make your changes above", "warning", "✏️");
}

/* --------------------------------------------------------------------------
   17. DELETE TASK
   -------------------------------------------------------------------------- */
async function deleteTask(id) {
    const confirmed = await showConfirmModal(
        "Delete Task?",
        "Are you sure you want to permanently delete this task? This cannot be undone.",
        "Delete Task"
    );

    if (!confirmed) return;

    tasks = tasks.filter((task) => task.id !== id);

    if (editingTaskId === id) {
        editingTaskId = null;
        addTaskBtn.innerHTML = `<span class="btn-icon">+</span><span class="btn-text">Add Task</span>`;
        addTaskBtn.style.background = "";
        clearInputs();
    }

    playSound("delete");
    showToast("Task deleted", "danger", "🗑️");

    saveTasks();
    renderTasks();
}

/* --------------------------------------------------------------------------
   18. CLEAR ALL COMPLETED TASKS
   -------------------------------------------------------------------------- */
clearCompletedBtn.addEventListener("click", async () => {
    const completedTasks = tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
        showToast("No completed tasks to clear!", "warning", "ℹ️");
        return;
    }

    const confirmed = await showConfirmModal(
        "Clear Completed Tasks?",
        `Are you sure you want to remove all ${completedTasks.length} completed task(s)?`,
        "Clear All Completed"
    );

    if (!confirmed) return;

    tasks = tasks.filter((t) => !t.completed);
    playSound("delete");
    showToast(`Cleared ${completedTasks.length} completed task(s)`, "danger", "🧹");

    saveTasks();
    renderTasks();
});

/* --------------------------------------------------------------------------
   19. UPDATE STATISTICS & PRODUCTIVITY BAR
   -------------------------------------------------------------------------- */
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;

    // Numerical Counters
    totalCount.textContent = total;
    pendingCount.textContent = pending;
    completedCount.textContent = completed;

    // Filter Badges
    badgeAll.textContent = total;
    badgePending.textContent = pending;
    badgeCompleted.textContent = completed;

    // Progress Bar Calculation
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;

    // Motivational Caption
    if (total === 0) {
        progressCaption.textContent = "Ready to start your day! Add your tasks above.";
    } else if (percentage === 100) {
        progressCaption.textContent = "Outstanding! All tasks completed today! 🎉🏆";
    } else if (percentage >= 70) {
        progressCaption.textContent = "Incredible momentum! You're almost at the finish line! 🚀";
    } else if (percentage >= 40) {
        progressCaption.textContent = "Solid progress! Keep pushing forward! 💪";
    } else {
        progressCaption.textContent = "Every big accomplishment starts with the first step! ✨";
    }
}

/* --------------------------------------------------------------------------
   20. FILTER & SEARCH HANDLERS
   -------------------------------------------------------------------------- */
filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.getAttribute("data-filter");
        renderTasks();
    });
});

searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    clearSearchBtn.style.display = currentSearch ? "block" : "none";
    renderTasks();
});

clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearch = "";
    clearSearchBtn.style.display = "none";
    searchInput.focus();
    renderTasks();
});

sortSelect.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderTasks();
});

/* Empty State Focus Button */
emptyFocusBtn.addEventListener("click", () => {
    taskInput.focus();
});

/* --------------------------------------------------------------------------
   21. SOUND & THEME TOGGLE CONTROLS
   -------------------------------------------------------------------------- */
soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
    localStorage.setItem("taskSoundEnabled", soundEnabled);
    if (soundEnabled) {
        playSound("add");
        showToast("Sound effects enabled", "success", "🔊");
    } else {
        showToast("Sound effects muted", "warning", "🔇");
    }
});

themeToggleBtn.addEventListener("click", () => {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const nextTheme = themes[currentThemeIndex];
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("taskTheme", nextTheme);

    const themeNames = {
        dark: "Midnight Obsidian",
        aurora: "Cyber Aurora",
        violet: "Cosmic Violet"
    };
    showToast(`Switched theme to ${themeNames[nextTheme]}`, "success", "🎨");
});

/* --------------------------------------------------------------------------
   22. EVENT LISTENERS FOR ADD BUTTON & KEYBOARD
   -------------------------------------------------------------------------- */
addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        addTask();
    }
});

/* --------------------------------------------------------------------------
   23. INITIALIZATION
   -------------------------------------------------------------------------- */
loadTasks();