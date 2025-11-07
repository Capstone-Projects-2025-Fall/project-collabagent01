(function(){
    // Note: The tasksWebviewReady message is sent from mainPanel.html when the tab becomes visible

    // Store all tasks for filtering
    let allTasks = [];

    // Set up event listeners for Tasks panel
    const connectBtn = document.getElementById('connect-jira-btn');
    const refreshBtn = document.getElementById('refresh-tasks-btn');
    const retryBtn = document.getElementById('retry-tasks-btn');
    const createTaskBtn = document.getElementById('create-task-btn');
    const sprintFilter = document.getElementById('sprint-filter');
    const createTaskModal = document.getElementById('create-task-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const createTaskForm = document.getElementById('create-task-form');

    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            window.vscode.postMessage({ command: 'connectJira' });
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.vscode.postMessage({ command: 'refreshTasks' });
        });
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.vscode.postMessage({ command: 'retryTasks' });
        });
    }

    // Create Task Button - Open Modal
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', () => {
            if (createTaskModal) {
                createTaskModal.style.display = 'flex';
                // Focus on summary input
                const summaryInput = document.getElementById('task-summary');
                if (summaryInput) {
                    setTimeout(() => summaryInput.focus(), 100);
                }
            }
        });
    }

    // Close Modal Handlers
    function closeModal() {
        if (createTaskModal) {
            createTaskModal.style.display = 'none';
            // Reset form
            if (createTaskForm) {
                createTaskForm.reset();
            }
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking overlay
    if (createTaskModal) {
        createTaskModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeModal();
            }
        });
    }

    // Handle form submission
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(createTaskForm);
            const taskData = {
                summary: formData.get('summary'),
                description: formData.get('description') || '',
                issuetype: formData.get('issuetype') || 'Task',
                priority: formData.get('priority') || ''
            };

            // Validate summary
            if (!taskData.summary || taskData.summary.trim() === '') {
                return; // HTML5 validation should catch this
            }

            // Show loading state
            const submitBtn = document.getElementById('submit-task-btn');
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }

            // Send message to extension
            window.vscode.postMessage({
                command: 'createTask',
                taskData: taskData
            });
        });
    }

    // Listen for task creation success/failure
    const originalMessageHandler = window.addEventListener;
    window.addEventListener('message', function(event) {
        const message = event.data;
        if (message.command === 'taskCreated') {
            // Success - close modal and reset form
            closeModal();
            const submitBtn = document.getElementById('submit-task-btn');
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        } else if (message.command === 'taskCreationFailed') {
            // Error - just remove loading state, keep modal open
            const submitBtn = document.getElementById('submit-task-btn');
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    });

    if (sprintFilter) {
        sprintFilter.addEventListener('change', (e) => {
            const value = e.target.value;

            // Reset other filters when changing sprints
            const statusFilterEl = document.getElementById('status-filter');
            const assigneeFilterEl = document.getElementById('assignee-filter');
            if (statusFilterEl) statusFilterEl.value = '';
            if (assigneeFilterEl) assigneeFilterEl.value = '';

            if (value === 'backlog') {
                window.vscode.postMessage({ command: 'loadBacklog' });
            } else if (value === '') {
                window.vscode.postMessage({ command: 'refreshTasks' });
            } else {
                // Sprint ID selected
                window.vscode.postMessage({
                    command: 'loadSprint',
                    sprintId: parseInt(value)
                });
            }
        });
    }

    // Add listeners for status and assignee filters
    const statusFilter = document.getElementById('status-filter');
    const assigneeFilter = document.getElementById('assignee-filter');

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            filterTasks();
        });
    }

    if (assigneeFilter) {
        assigneeFilter.addEventListener('change', () => {
            filterTasks();
        });
    }

    // Handle UI updates from extension
    window.addEventListener('message', function(event) {
        const message = event.data;
        if (message.command === 'updateTasksUI') {
            updateTasksUI(message);
        } else if (message.command === 'updateSprints') {
            updateSprintFilter(message.sprints);
        }
    });

    function updateSprintFilter(sprints) {
        const sprintFilterEl = document.getElementById('sprint-filter');
        if (!sprintFilterEl) return;

        // Keep existing options (All Issues and Backlog)
        let options = '<option value="">All Issues</option><option value="backlog">📋 Backlog</option>';

        // Add sprints, sorted by state (active first, then future, then closed)
        const sortedSprints = sprints.sort((a, b) => {
            const stateOrder = { active: 0, future: 1, closed: 2 };
            return stateOrder[a.state] - stateOrder[b.state];
        });

        sortedSprints.forEach(function(sprint) {
            const icon = sprint.state === 'active' ? '🏃' : sprint.state === 'future' ? '📅' : '✅';
            options += '<option value="' + sprint.id + '">' + icon + ' ' + sprint.name + '</option>';
        });

        sprintFilterEl.innerHTML = options;
    }

    function updateTasksUI(data) {
        // Update visibility of sections
        const setupEl = document.getElementById('jira-setup');
        const waitingEl = document.getElementById('jira-waiting');
        const contentEl = document.getElementById('tasks-content');
        const errorEl = document.getElementById('tasks-error');
        const statusEl = document.getElementById('status-text');

        if (setupEl) setupEl.style.display = data.showSetup ? 'block' : 'none';
        if (waitingEl) waitingEl.style.display = data.showWaiting ? 'block' : 'none';
        if (contentEl) contentEl.style.display = data.showTasks ? 'block' : 'none';
        if (errorEl) errorEl.style.display = data.showError ? 'block' : 'none';

        // Update status text
        if (statusEl) statusEl.textContent = data.statusText || '';

        // Update error message
        if (data.errorMessage) {
            const errorMsgEl = document.getElementById('error-message');
            if (errorMsgEl) errorMsgEl.textContent = data.errorMessage;
        }

        // Update tasks list
        if (data.tasks) {
            updateTasksList(data.tasks);
        }

        // Handle loading state
        const tasksListEl = document.getElementById('tasks-list');
        if (data.showLoading && tasksListEl) {
            tasksListEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Loading tasks...</span></div>';
        }
    }

    function filterTasks() {
        const statusFilterEl = document.getElementById('status-filter');
        const assigneeFilterEl = document.getElementById('assignee-filter');

        const statusValue = statusFilterEl ? statusFilterEl.value : '';
        const assigneeValue = assigneeFilterEl ? assigneeFilterEl.value : '';

        let filteredTasks = allTasks;

        // Filter by status
        if (statusValue) {
            filteredTasks = filteredTasks.filter(task => task.fields.status.name === statusValue);
        }

        // Filter by assignee
        if (assigneeValue) {
            if (assigneeValue === 'unassigned') {
                filteredTasks = filteredTasks.filter(task => !task.fields.assignee);
            } else {
                filteredTasks = filteredTasks.filter(task =>
                    task.fields.assignee && task.fields.assignee.displayName === assigneeValue
                );
            }
        }

        renderTasks(filteredTasks);
    }

    function updateTasksList(tasks) {
        // Store all tasks for filtering
        allTasks = tasks || [];

        // Update assignee filter dropdown
        updateAssigneeFilter(allTasks);

        // Render tasks (without any filters initially)
        renderTasks(allTasks);
    }

    function updateAssigneeFilter(tasks) {
        const assigneeFilterEl = document.getElementById('assignee-filter');
        if (!assigneeFilterEl) return;

        // Get unique assignees
        const assignees = new Set();
        let hasUnassigned = false;

        tasks.forEach(function(task) {
            if (task.fields.assignee) {
                assignees.add(task.fields.assignee.displayName);
            } else {
                hasUnassigned = true;
            }
        });

        // Build options
        let options = '<option value="">All Assignees</option>';

        // Add unique assignees sorted alphabetically
        Array.from(assignees).sort().forEach(function(assignee) {
            options += '<option value="' + assignee + '">' + assignee + '</option>';
        });

        // Add unassigned option if there are unassigned tasks
        if (hasUnassigned) {
            options += '<option value="unassigned">Unassigned</option>';
        }

        assigneeFilterEl.innerHTML = options;
    }

    function renderTasks(tasks) {
        const tasksListEl = document.getElementById('tasks-list');
        if (!tasksListEl) return;

        if (!tasks || tasks.length === 0) {
            tasksListEl.innerHTML = '<div class="no-tasks">No tasks found.</div>';
            return;
        }

        const tasksHtml = tasks.map(function(task) {
            const statusName = task.fields.status.name;
            const statusClass = statusName.toLowerCase().replace(/ /g, '-');

            // Determine which transition buttons to show based on current status
            let transitionButtons = '';
            if (statusName === 'To Do') {
                transitionButtons = '<button class="transition-btn btn-in-progress" data-key="' + task.key + '" data-transition="In Progress">Start</button>';
            } else if (statusName === 'In Progress') {
                transitionButtons = '<button class="transition-btn btn-done" data-key="' + task.key + '" data-transition="Done">Complete</button>';
            }

            return '<div class="task-item">' +
                '<div class="task-header">' +
                    '<span class="task-key">' + task.key + '</span>' +
                    '<span class="task-status status-' + statusClass + '">' + statusName + '</span>' +
                '</div>' +
                '<div class="task-title">' + task.fields.summary + '</div>' +
                '<div class="task-meta">' +
                    (task.fields.assignee ? '<span class="task-assignee">👤 ' + task.fields.assignee.displayName + '</span>' : '<span class="task-assignee">👤 Unassigned</span>') +
                    (task.fields.priority ? '<span class="task-priority">⚡ ' + task.fields.priority.name + '</span>' : '') +
                '</div>' +
                (transitionButtons ? '<div class="task-actions">' + transitionButtons + '</div>' : '') +
            '</div>';
        }).join('');

        tasksListEl.innerHTML = tasksHtml;

        // Add event listeners to transition buttons
        document.querySelectorAll('.transition-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                const key = e.target.getAttribute('data-key');
                const transition = e.target.getAttribute('data-transition');
                window.vscode.postMessage({
                    command: 'transitionIssue',
                    issueKey: key,
                    targetStatus: transition
                });
            });
        });
    }
})();
