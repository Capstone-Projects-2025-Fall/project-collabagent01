(function(){
    // Note: The tasksWebviewReady message is sent from mainPanel.html when the tab becomes visible

    // Store all tasks for filtering
    let allTasks = [];

    // Set up event listeners for Tasks panel
    const jiraSetupForm = document.getElementById('jira-setup-form');
    const tokenHelpLink = document.getElementById('token-help-link');
    const tokenHelpTooltip = document.getElementById('token-help-tooltip');
    const closeHelpTooltip = document.getElementById('close-help-tooltip');
    const connectBtn = document.getElementById('connect-jira-btn');
    const disconnectBtn = document.getElementById('disconnect-jira-btn');
    const refreshBtn = document.getElementById('refresh-tasks-btn');
    const retryBtn = document.getElementById('retry-tasks-btn');
    const createTaskBtn = document.getElementById('create-task-btn');
    const aiSuggestionsBtn = document.getElementById('ai-suggestions-btn');
    const sprintFilter = document.getElementById('sprint-filter');
    const createTaskModal = document.getElementById('create-task-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const createTaskForm = document.getElementById('create-task-form');

    // Jira setup form submission
    if (jiraSetupForm) {
        jiraSetupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const jiraUrl = document.getElementById('jira-url').value.trim();
            const jiraEmail = document.getElementById('jira-email').value.trim();
            const jiraToken = document.getElementById('jira-token').value.trim();
            const statusEl = document.getElementById('jira-setup-status');

            // Show loading state
            if (connectBtn) {
                connectBtn.disabled = true;
                connectBtn.innerHTML = '<span class="button-icon">⏳</span>Connecting...';
            }

            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.className = 'setup-status info';
                statusEl.textContent = 'Connecting to Jira...';
            }

            // Send to extension
            window.vscode.postMessage({
                command: 'connectJiraWithCredentials',
                jiraUrl,
                jiraEmail,
                jiraToken
            });
        });
    }

    // Token help link toggle
    if (tokenHelpLink) {
        tokenHelpLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (tokenHelpTooltip) {
                tokenHelpTooltip.style.display = 'block';
            }
        });
    }

    if (closeHelpTooltip) {
        closeHelpTooltip.addEventListener('click', () => {
            if (tokenHelpTooltip) {
                tokenHelpTooltip.style.display = 'none';
            }
        });
    }

    // Legacy connect button (kept for backwards compatibility, but form is preferred)
    if (connectBtn && !jiraSetupForm) {
        connectBtn.addEventListener('click', () => {
            window.vscode.postMessage({ command: 'connectJira' });
        });
    }

    if (disconnectBtn) {
        console.log('[Tasks] Disconnect button found, adding click listener');
        disconnectBtn.addEventListener('click', () => {
            console.log('[Tasks] Disconnect button clicked - sending disconnect request');
            // Send disconnect request to extension (extension will show confirmation dialog)
            window.vscode.postMessage({ command: 'disconnectJira' });
        });
    } else {
        console.log('[Tasks] Disconnect button NOT found in DOM');
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

    // AI Suggestions Button - Get AI recommendations for unassigned tasks
    if (aiSuggestionsBtn) {
        aiSuggestionsBtn.addEventListener('click', () => {
            // Disable button and show loading state
            aiSuggestionsBtn.disabled = true;
            aiSuggestionsBtn.classList.add('loading');
            const originalText = aiSuggestionsBtn.innerHTML;
            aiSuggestionsBtn.innerHTML = '<span class="button-icon"></span>Analyzing...';

            window.vscode.postMessage({ command: 'getAISuggestions' });

            // Re-enable button after 3 seconds (in case no response)
            setTimeout(() => {
                aiSuggestionsBtn.disabled = false;
                aiSuggestionsBtn.classList.remove('loading');
                aiSuggestionsBtn.innerHTML = originalText;
            }, 30000); // 30 second timeout
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

    // Listen for task creation success/failure, AI suggestions completion, and Jira connection
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
        } else if (message.command === 'aiSuggestionsComplete' || message.command === 'aiSuggestionsFailed') {
            // Reset AI Suggestions button state
            const aiBtn = document.getElementById('ai-suggestions-btn');
            if (aiBtn) {
                aiBtn.disabled = false;
                aiBtn.classList.remove('loading');
                aiBtn.innerHTML = '<span class="button-icon"></span>Get AI Suggestions';
            }
        } else if (message.command === 'jiraConnected') {
            // Jira connection successful
            const statusEl = document.getElementById('jira-setup-status');
            const connectBtn = document.getElementById('connect-jira-btn');

            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.className = 'setup-status success';
                statusEl.textContent = '✓ Successfully connected to Jira!';
            }

            if (connectBtn) {
                connectBtn.disabled = false;
                connectBtn.innerHTML = '<span class="button-icon">✓</span>Connected!';
            }

            // Form will be hidden automatically by the extension via updateTasksUI
        } else if (message.command === 'jiraConnectionFailed') {
            // Jira connection failed
            const statusEl = document.getElementById('jira-setup-status');
            const connectBtn = document.getElementById('connect-jira-btn');

            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.className = 'setup-status error';
                statusEl.textContent = '✗ ' + (message.error || 'Failed to connect to Jira');
            }

            if (connectBtn) {
                connectBtn.disabled = false;
                connectBtn.innerHTML = '<span class="button-icon">🔗</span>Connect to Jira';
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
        const disconnectBtn = document.getElementById('disconnect-jira-btn');

        if (setupEl) setupEl.style.display = data.showSetup ? 'block' : 'none';
        if (waitingEl) waitingEl.style.display = data.showWaiting ? 'block' : 'none';
        if (contentEl) contentEl.style.display = data.showTasks ? 'block' : 'none';
        if (errorEl) errorEl.style.display = data.showError ? 'block' : 'none';

        // Show/hide disconnect button for admins only when tasks are visible
        if (disconnectBtn) {
            const shouldShow = data.showTasks && data.isAdmin;
            console.log('[Tasks] Disconnect button visibility - showTasks:', data.showTasks, 'isAdmin:', data.isAdmin, 'shouldShow:', shouldShow);
            disconnectBtn.style.display = shouldShow ? 'inline-block' : 'none';
        } else {
            console.log('[Tasks] Disconnect button element not found in updateTasksUI');
        }

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

        // Debug: Log first task to see story points
        if (allTasks.length > 0) {
            console.log('[Tasks] First task data:', JSON.stringify(allTasks[0], null, 2));
            console.log('[Tasks] Story points field:', allTasks[0].fields.customfield_10026);
        }

        // Extract assignable users from current tasks
        extractAssignableUsersFromTasks(allTasks);

        // Update assignee filter dropdown
        updateAssigneeFilter(allTasks);

        // Render tasks (without any filters initially)
        renderTasks(allTasks);
    }

    // Extract unique assignees from tasks to use for reassignment
    function extractAssignableUsersFromTasks(tasks) {
        const usersMap = new Map();
        
        tasks.forEach(function(task) {
            if (task.fields.assignee) {
                const assignee = task.fields.assignee;
                if (!usersMap.has(assignee.accountId)) {
                    usersMap.set(assignee.accountId, {
                        accountId: assignee.accountId,
                        displayName: assignee.displayName,
                        emailAddress: assignee.emailAddress
                    });
                }
            }
        });
        
        // Converts map to array and sort by display name
        assignableUsers = Array.from(usersMap.values()).sort(function(a, b) {
            return a.displayName.localeCompare(b.displayName);
        });
        
        console.log('[Tasks] Extracted assignable users from tasks:', assignableUsers.length);
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

            // Debug story points
            if (task.fields.customfield_10026) {
                console.log('[Tasks] Task', task.key, 'has story points:', task.fields.customfield_10026);
            } else {
                console.log('[Tasks] Task', task.key, 'NO story points. Field value:', task.fields.customfield_10026);
            }

            // Determine which transition buttons to show based on current status
            let transitionButtons = '';
            if (statusName === 'To Do') {
                transitionButtons = '<button class="transition-btn btn-in-progress" data-key="' + task.key + '" data-transition="In Progress">Start</button>';
            } else if (statusName === 'In Progress') {
                transitionButtons = '<button class="transition-btn btn-done" data-key="' + task.key + '" data-transition="Done">Complete</button>';
            }

            // the reassign button
            const reassignButton = '<button class="reassign-btn" data-key="' + task.key + '" data-current-assignee="' + 
                (task.fields.assignee ? task.fields.assignee.accountId : '') + '">👥 Reassign</button>';

            return '<div class="task-item">' +
                '<div class="task-header">' +
                    '<div class="task-key-group">' +
                        '<span class="task-key">' + task.key + '</span>' +
                        (task.fields.customfield_10026 
                            ? '<span class="task-story-points-badge editable" data-key="' + task.key + '" data-points="' + task.fields.customfield_10026 + '" title="Click to edit">' + task.fields.customfield_10026 + ' SP</span>' 
                            : '<span class="task-story-points-badge editable empty" data-key="' + task.key + '" data-points="" title="Click to add">+ SP</span>') +
                    '</div>' +
                    '<span class="task-status status-' + statusClass + '">' + statusName + '</span>' +
                '</div>' +
                '<div class="task-title">' + task.fields.summary + '</div>' +
                '<div class="task-meta">' +
                    (task.fields.assignee ? '<span class="task-assignee">👤 ' + task.fields.assignee.displayName + '</span>' : '<span class="task-assignee">👤 Unassigned</span>') +
                    (task.fields.priority 
                        ? '<span class="task-priority editable" data-key="' + task.key + '" data-priority="' + task.fields.priority.name + '" title="Click to change priority">⚡ ' + task.fields.priority.name + '</span>' 
                        : '<span class="task-priority editable empty" data-key="' + task.key + '" data-priority="" title="Click to set priority">⚡ Set Priority</span>') +
                '</div>' +
                '<div class="task-actions">' + 
                    (transitionButtons || '') +
                    reassignButton +
                '</div>' +
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

        // Added event listeners to reassign buttons
        document.querySelectorAll('.reassign-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                const key = e.target.getAttribute('data-key');
                const currentAssigneeId = e.target.getAttribute('data-current-assignee');
                showReassignDropdown(key, currentAssigneeId, e.target);
            });
        });

        // Add event listeners to story points badges for editing
        document.querySelectorAll('.task-story-points-badge.editable').forEach(function(badge) {
            badge.addEventListener('click', function(e) {
                const key = e.target.getAttribute('data-key');
                const currentPoints = e.target.getAttribute('data-points');
                showStoryPointsEditor(key, currentPoints, e.target);
            });
        });

        // Adds event listeners to priority badges for editing
        document.querySelectorAll('.task-priority.editable').forEach(function(badge) {
            badge.addEventListener('click', function(e) {
                const key = e.target.getAttribute('data-key');
                const currentPriority = e.target.getAttribute('data-priority');
                showPriorityDropdown(key, currentPriority, e.target);
            });
        });
    }

    // Show story points editor
    function showStoryPointsEditor(issueKey, currentPoints, badgeElement) {
        const existingEditor = document.querySelector('.story-points-editor');
        if (existingEditor) {
            existingEditor.remove();
        }

        const editor = document.createElement('div');
        editor.className = 'story-points-editor';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'story-points-input';
        input.value = currentPoints || '';
        input.placeholder = 'SP';
        input.min = '0';
        input.step = '1';
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'story-points-save';
        saveBtn.textContent = '✓';
        saveBtn.title = 'Save';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'story-points-cancel';
        cancelBtn.textContent = '✕';
        cancelBtn.title = 'Cancel';
        
        editor.appendChild(input);
        editor.appendChild(saveBtn);
        editor.appendChild(cancelBtn);
        
        // Position editor near badge
        const rect = badgeElement.getBoundingClientRect();
        editor.style.position = 'absolute';
        editor.style.top = (rect.top + window.scrollY) + 'px';
        editor.style.left = (rect.left + window.scrollX) + 'px';
        
        document.body.appendChild(editor);
        input.focus();
        input.select();
        
        // Save handler
        const saveHandler = function() {
            const newValue = input.value.trim();
            const storyPoints = newValue === '' ? null : parseInt(newValue, 10);
            
            if (storyPoints !== null && (isNaN(storyPoints) || storyPoints < 0)) {
                input.classList.add('error');
                return;
            }
            
            window.vscode.postMessage({
                command: 'updateStoryPoints',
                issueKey: issueKey,
                storyPoints: storyPoints
            });
            
            editor.remove();
        };
        
        // Cancel handler
        const cancelHandler = function() {
            editor.remove();
        };
        
        saveBtn.addEventListener('click', saveHandler);
        cancelBtn.addEventListener('click', cancelHandler);
        
        // Save on Enter, cancel on Escape
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                saveHandler();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        });
        
        // Close when clicking outside or scrolling
        setTimeout(function() {
            function closeEditor(e) {
                if (!editor.contains(e.target) && e.target !== badgeElement) {
                    editor.remove();
                    document.removeEventListener('click', closeEditor);
                    document.removeEventListener('scroll', onScroll, true);
                }
            }

            function onScroll() {
                editor.remove();
                document.removeEventListener('click', closeEditor);
                document.removeEventListener('scroll', onScroll, true);
            }

            document.addEventListener('click', closeEditor);
            document.addEventListener('scroll', onScroll, true);
        }, 100);
    }

    // Store assignable users globally (extracted from tasks)
    let assignableUsers = [];

    // Shows the reassign dropdown
    function showReassignDropdown(issueKey, currentAssigneeId, buttonElement) {
        const existingDropdown = document.querySelector('.reassign-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Creates the dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'reassign-dropdown';
        
        let dropdownHtml = '<div class="reassign-dropdown-header">Assign to:</div>';
        
        // Add "Unassigned" option
        dropdownHtml += '<div class="reassign-option' + (!currentAssigneeId ? ' selected' : '') + '" data-account-id="">' +
            '<span class="assignee-icon">👤</span>' +
            '<span class="assignee-name">Unassigned</span>' +
        '</div>';
        
        // Add user options
        assignableUsers.forEach(function(user) {
            const isSelected = user.accountId === currentAssigneeId;
            dropdownHtml += '<div class="reassign-option' + (isSelected ? ' selected' : '') + '" data-account-id="' + user.accountId + '">' +
                '<span class="assignee-icon">👤</span>' +
                '<span class="assignee-name">' + user.displayName + '</span>' +
            '</div>';
        });
        
        dropdown.innerHTML = dropdownHtml;
        
        // Position dropdown near button
        const rect = buttonElement.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
        dropdown.style.left = rect.left + 'px';
        
        document.body.appendChild(dropdown);
        
        // Add click handlers to options
        dropdown.querySelectorAll('.reassign-option').forEach(function(option) {
            option.addEventListener('click', function() {
                const accountId = this.getAttribute('data-account-id') || null;
                window.vscode.postMessage({
                    command: 'reassignIssue',
                    issueKey: issueKey,
                    accountId: accountId
                });
                dropdown.remove();
            });
        });
        
        // Close dropdown when clicking outside or scrolling
        setTimeout(function() {
            function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== buttonElement) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                    document.removeEventListener('scroll', onScroll, true);
                }
            }

            function onScroll() {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
                document.removeEventListener('scroll', onScroll, true);
            }

            document.addEventListener('click', closeDropdown);
            document.addEventListener('scroll', onScroll, true);
        }, 100);
    }

    // Show priority dropdown
    function showPriorityDropdown(issueKey, currentPriority, badgeElement) {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.priority-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Priority options in Jira
        const priorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'priority-dropdown';
        
        let dropdownHtml = '<div class="priority-dropdown-header">Set Priority:</div>';
        
        // Add priority options
        priorities.forEach(function(priority) {
            const isSelected = priority === currentPriority;
            const emoji = getPriorityEmoji(priority);
            dropdownHtml += '<div class="priority-option' + (isSelected ? ' selected' : '') + '" data-priority="' + priority + '">' +
                '<span class="priority-icon">' + emoji + '</span>' +
                '<span class="priority-name">' + priority + '</span>' +
            '</div>';
        });
        
        dropdown.innerHTML = dropdownHtml;
        
        // Position dropdown near badge
        const rect = badgeElement.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
        dropdown.style.left = rect.left + 'px';
        
        document.body.appendChild(dropdown);
        
        // Add click handlers to options
        dropdown.querySelectorAll('.priority-option').forEach(function(option) {
            option.addEventListener('click', function() {
                const priority = this.getAttribute('data-priority');
                window.vscode.postMessage({
                    command: 'updatePriority',
                    issueKey: issueKey,
                    priorityName: priority
                });
                dropdown.remove();
            });
        });
        
        // Close dropdown when clicking outside or scrolling
        setTimeout(function() {
            function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== badgeElement) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                    document.removeEventListener('scroll', onScroll, true);
                }
            }

            function onScroll() {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
                document.removeEventListener('scroll', onScroll, true);
            }

            document.addEventListener('click', closeDropdown);
            document.addEventListener('scroll', onScroll, true);
        }, 100);
    }

    // Helper function to get emoji for priority
    function getPriorityEmoji(priority) {
        switch(priority) {
            case 'Highest': return '🔴';
            case 'High': return '🟠';
            case 'Medium': return '🟡';
            case 'Low': return '🟢';
            case 'Lowest': return '🔵';
            default: return '⚡';
        }
    }
})();
