import * as vscode from 'vscode';
import { JiraService } from '../services/jira-service';

/**
 * Tasks panel for displaying Jira issues/tasks for teams.
 * Admin users can configure Jira integration, all team members can view tasks.
 */
export class TasksPanel {
    private _context: vscode.ExtensionContext;
    private _view?: vscode.WebviewView;
    private _currentTeamId?: string | null;
    private _currentUserRole?: string | null;
    private _jiraConfigured: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    /**
     * Sets the webview for message handling
     */
    public setWebview(view: vscode.WebviewView) {
        this._view = view;
        this.setupMessageHandling();
    }

    /**
     * Gets the HTML content for the Tasks panel.
     * Shows different UI based on user role and Jira connection status.
     */
    public getHtml(): string {
        return `
            <div class="tasks-container">
                <div class="tasks-header">
                    <h2>Team Tasks</h2>
                    <div class="info-icon-wrapper">
                        <svg class="info-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
                            <text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">i</text>
                        </svg>
                        <div class="tooltip">
                            First, generate your Jira token:<br>Go to Jira in your browser &rarr; your Jira profile &rarr; manage your account &rarr; security tab &rarr; create and manage API tokens &rarr; generate a personal token <br><br> Once you have your token, return to VS Code and use Ctrl+Shift+P to open the command palette. Search for and select "Collab Agent: Connect to Jira" (or click the Jira button in the bottom status bar). When prompted, enter your Jira instance URL, your Jira email address, and paste your personal API token. Finally, select the correct project board from the project dropdown. Your Jira configuration will be saved, and the status bar will show a Jira icon with a checkmark to confirm the connection.
                        </div>
                    </div>
                </div>
                <div id="tasks-status" class="tasks-status" style="text-align: center; margin-bottom: 12px;">
                    <span id="status-text">Loading...</span>
                </div>

                <!-- Admin Setup UI -->
                <div id="jira-setup" class="jira-setup" style="display: none;">
                    <div class="setup-card">
                        <h3>🔗 Connect to Jira</h3>
                        <p>Connect your team's Jira board to view and track tasks collaboratively.</p>
                        <div class="setup-steps">
                            <div class="step">
                                <span class="step-number">1</span>
                                <span>Ensure you have a Jira account with access to the team board</span>
                            </div>
                            <div class="step">
                                <span class="step-number">2</span>
                                <span>Use Command Palette or Status Bar to connect Jira</span>
                            </div>
                            <div class="step">
                                <span class="step-number">3</span>
                                <span>All team members will be able to view tasks</span>
                            </div>
                        </div>
                        <div class="command-info">
                            <p><strong>How to connect:</strong></p>
                            <ul>
                                <li><strong>Command Palette:</strong> Ctrl+Shift+P → "Collab Agent: Connect to Jira"</li>
                                <li><strong>Status Bar:</strong> Click the Jira icon in the bottom status bar</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Member Waiting UI -->
                <div id="jira-waiting" class="jira-waiting" style="display: none;">
                    <div class="waiting-card">
                        <div class="waiting-icon">⏳</div>
                        <h3>Jira Integration Not Configured</h3>
                        <p>Please ask your team admin to set up the Jira integration.</p>
                        <div class="waiting-tip">
                            <strong>Tip:</strong> Once your admin connects Jira, all team members will be able to view and track tasks from the shared Jira board.
                        </div>
                    </div>
                </div>

                <!-- Tasks List UI -->
                <div id="tasks-content" class="tasks-content" style="display: none;">
                    <div class="tasks-toolbar">
                        <div class="tasks-filters">
                            <select id="sprint-filter" class="filter-select">
                                <option value="">All Issues</option>
                                <option value="backlog">📋 Backlog</option>
                            </select>
                            <select id="status-filter" class="filter-select">
                                <option value="">All Statuses</option>
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                            <select id="assignee-filter" class="filter-select">
                                <option value="">All Assignees</option>
                            </select>
                        </div>
                        <div class="tasks-actions">
                            <button class="button small" id="refresh-tasks-btn" title="Refresh tasks">
                                <span class="button-icon">🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div id="tasks-list" class="tasks-list">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <span>Loading tasks...</span>
                        </div>
                    </div>
                </div>

                <!-- Error State -->
                <div id="tasks-error" class="tasks-error" style="display: none;">
                    <div class="error-card">
                        <div class="error-icon">⚠️</div>
                        <h3>Unable to Load Tasks</h3>
                        <p id="error-message">An error occurred while fetching tasks.</p>
                        <button class="button" id="retry-tasks-btn">Try Again</button>
                    </div>
                </div>
            </div>

            <script>
            (function(){
                // Note: The tasksWebviewReady message is sent from mainPanel.html when the tab becomes visible

                // Store all tasks for filtering
                let allTasks = [];

                // Set up event listeners for Tasks panel
                const connectBtn = document.getElementById('connect-jira-btn');
                const refreshBtn = document.getElementById('refresh-tasks-btn');
                const retryBtn = document.getElementById('retry-tasks-btn');
                const sprintFilter = document.getElementById('sprint-filter');

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
            </script>
        `;
    }

    /**
     * Sets up message handling for the webview
     */
    private setupMessageHandling() {
        if (!this._view) return;

        // Note: Message handling is done in MainPanel.handleTasksMessage
        // This is kept for reference but messages won't reach here
        this._view.webview.onDidReceiveMessage(async (message: any) => {
            console.log('TasksPanel received message (note: MainPanel handles these):', message);
        });
    }

    /**
     * Initializes the panel with current team and user state
     */
    public async initializePanel() {
        await this.refreshTeamState();

        // Give the webview a moment to fully load before sending the first message
        setTimeout(() => {
            this.updateUI();
        }, 100);
    }

    /**
     * Refreshes the current team and user state
     */
    private async refreshTeamState() {
        try {
            // Get current team from global state
            this._currentTeamId = this._context.globalState.get<string>('collabAgent.currentTeam');

            if (!this._currentTeamId) {
                this._currentUserRole = null;
                this._jiraConfigured = false;
                return;
            }

            // Get user role for this team
            const { getUserTeams } = require('../services/team-service');
            const result = await getUserTeams();
            if (result.error) {
                console.error('Failed to get user teams:', result.error);
                this._currentUserRole = null;
                this._jiraConfigured = false;
                return;
            }

            const currentTeam = result.teams?.find((t: any) => t.id === this._currentTeamId);
            this._currentUserRole = currentTeam?.role || null;

            // Check if Jira is configured for this team
            const jiraService = JiraService.getInstance();
            const jiraConfig = await jiraService.getJiraConfig(this._currentTeamId);
            this._jiraConfigured = !!jiraConfig;

        } catch (error) {
            console.error('Failed to refresh team state:', error);
            this._currentTeamId = null;
            this._currentUserRole = null;
            this._jiraConfigured = false;
        }
    }

    /**
     * Updates the UI based on current state
     * Implements the three workflows: Admin setup, Non-admin waiting, All users (post-setup)
     */
    private updateUI() {
        if (!this._view) return;

        // Workflow 1 & 2: No team or not a team member
        if (!this._currentTeamId || !this._currentUserRole) {
            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showSetup: false,
                showWaiting: false,
                showTasks: false,
                showError: true,
                showLoading: false,
                statusText: 'No team selected',
                errorMessage: !this._currentTeamId
                    ? 'Please select a team in the Agent Bot tab first.'
                    : 'You are not a member of the current team.'
            });
            return;
        }

        // Workflow 2: Jira not configured
        if (!this._jiraConfigured) {
            if (this._currentUserRole === 'admin') {
                // Admin Workflow: Show setup instructions
                this._view.webview.postMessage({
                    command: 'updateTasksUI',
                    showSetup: true,
                    showWaiting: false,
                    showTasks: false,
                    showError: false,
                    showLoading: false,
                    statusText: 'Setup required'
                });
            } else {
                // Non-Admin Workflow: Show waiting message
                this._view.webview.postMessage({
                    command: 'updateTasksUI',
                    showSetup: false,
                    showWaiting: true,
                    showTasks: false,
                    showError: false,
                    showLoading: false,
                    statusText: 'Waiting for admin setup'
                });
            }
            return;
        }

        // Workflow 3: Jira is configured - show tasks for all users
        this._view.webview.postMessage({
            command: 'updateTasksUI',
            showSetup: false,
            showWaiting: false,
            showTasks: true,
            showError: false,
            showLoading: true,
            statusText: 'Loading tasks...'
        });

        // Load tasks and sprints from Jira
        this.loadTasks();
        this.loadSprints();
    }

    /**
     * Updates the panel state - refreshes team state and UI
     * Called externally when team changes
     */
    public async updatePanelState() {
        await this.refreshTeamState();
        this.updateUI();
    }

    /**
     * Loads and displays Jira tasks for the current team.
     */
    public async loadTasks() {
        if (!this._currentTeamId || !this._view) return;

        try {
            const jiraService = JiraService.getInstance();
            const issues = await jiraService.fetchTeamIssues(this._currentTeamId);

            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showTasks: true,
                showLoading: false,
                showError: false,
                statusText: `${issues.length} tasks loaded`,
                tasks: issues
            });

        } catch (error) {
            console.error('Failed to load tasks:', error);
            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showTasks: false,
                showError: true,
                showLoading: false,
                statusText: 'Error loading tasks',
                errorMessage: error instanceof Error ? error.message : 'Failed to load tasks'
            });
        }
    }

    /**
     * Handles Jira connection for team admin.
     */
    public async handleConnectJira() {
        if (!this._currentTeamId || this._currentUserRole !== 'admin') return;

        try {
            const jiraService = JiraService.getInstance();

            // Get current user ID
            const { getAuthContext } = require('../services/auth-service');
            const authResult = await getAuthContext();
            const adminUserId = authResult?.context?.id;

            if (!adminUserId) {
                throw new Error('Unable to get user authentication context');
            }

            await jiraService.initiateJiraAuth(this._currentTeamId, adminUserId);

            // Refresh state after successful connection
            await this.refreshTeamState();
            this.updateUI();

        } catch (error) {
            console.error('Failed to connect Jira:', error);
            vscode.window.showErrorMessage(
                `Failed to connect to Jira: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handles refreshing tasks.
     */
    public async handleRefreshTasks() {
        if (this._jiraConfigured) {
            this._view?.webview.postMessage({
                command: 'updateTasksUI',
                showLoading: true,
                statusText: 'Refreshing tasks...'
            });
            await this.loadTasks();
            await this.loadSprints();
        }
    }

    /**
     * Loads sprints and updates the sprint filter dropdown.
     */
    public async loadSprints() {
        if (!this._currentTeamId || !this._view || !this._jiraConfigured) return;

        try {
            const jiraService = JiraService.getInstance();
            const sprints = await jiraService.fetchSprints(this._currentTeamId);

            this._view.webview.postMessage({
                command: 'updateSprints',
                sprints: sprints
            });

        } catch (error) {
            console.error('Failed to load sprints:', error);
            // Don't show error to user, just log it
        }
    }

    /**
     * Loads issues for a specific sprint.
     */
    public async handleLoadSprint(sprintId: number) {
        if (!this._currentTeamId || !this._view) return;

        try {
            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showLoading: true,
                statusText: 'Loading sprint issues...'
            });

            const jiraService = JiraService.getInstance();
            const issues = await jiraService.fetchSprintIssues(this._currentTeamId, sprintId);

            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showTasks: true,
                showLoading: false,
                showError: false,
                statusText: `${issues.length} issues in sprint`,
                tasks: issues
            });

        } catch (error) {
            console.error('Failed to load sprint issues:', error);
            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showTasks: false,
                showError: true,
                showLoading: false,
                statusText: 'Error loading sprint',
                errorMessage: error instanceof Error ? error.message : 'Failed to load sprint issues'
            });
        }
    }

    /**
     * Loads backlog issues.
     */
    public async handleLoadBacklog() {
        if (!this._currentTeamId || !this._view) return;

        try {
            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showLoading: true,
                statusText: 'Loading backlog...'
            });

            const jiraService = JiraService.getInstance();
            const issues = await jiraService.fetchBacklogIssues(this._currentTeamId);

            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showTasks: true,
                showLoading: false,
                showError: false,
                statusText: `${issues.length} issues in backlog`,
                tasks: issues
            });

        } catch (error) {
            console.error('Failed to load backlog:', error);
            this._view.webview.postMessage({
                command: 'updateTasksUI',
                showTasks: false,
                showError: true,
                showLoading: false,
                statusText: 'Error loading backlog',
                errorMessage: error instanceof Error ? error.message : 'Failed to load backlog issues'
            });
        }
    }

    /**
     * Handles transitioning an issue to a new status.
     */
    public async handleTransitionIssue(issueKey: string, targetStatus: string) {
        if (!this._currentTeamId) return;

        try {
            const jiraService = JiraService.getInstance();

            // First, get available transitions for the issue
            const transitions = await jiraService.fetchTransitions(this._currentTeamId, issueKey);

            // Find the transition that matches the target status
            const transition = transitions.find(t => t.to.name === targetStatus);

            if (!transition) {
                vscode.window.showErrorMessage(`Cannot transition ${issueKey} to "${targetStatus}". This transition may not be available.`);
                return;
            }

            // Perform the transition
            await jiraService.transitionIssue(this._currentTeamId, issueKey, transition.id);

            vscode.window.showInformationMessage(`✅ ${issueKey} moved to "${targetStatus}"`);

            // Refresh the task list to show updated status
            await this.handleRefreshTasks();

        } catch (error) {
            console.error('Failed to transition issue:', error);
            vscode.window.showErrorMessage(
                `Failed to transition ${issueKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}
