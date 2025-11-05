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
                    <div id="tasks-status" class="tasks-status">
                        <span id="status-text">Loading...</span>
                    </div>
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

                // Set up event listeners for Tasks panel
                const connectBtn = document.getElementById('connect-jira-btn');
                const refreshBtn = document.getElementById('refresh-tasks-btn');
                const retryBtn = document.getElementById('retry-tasks-btn');

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

                // Handle UI updates from extension
                window.addEventListener('message', function(event) {
                    const message = event.data;
                    if (message.command === 'updateTasksUI') {
                        updateTasksUI(message);
                    }
                });

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

                function updateTasksList(tasks) {
                    const tasksListEl = document.getElementById('tasks-list');
                    if (!tasksListEl) return;

                    if (!tasks || tasks.length === 0) {
                        tasksListEl.innerHTML = '<div class="no-tasks">No tasks found.</div>';
                        return;
                    }

                    const tasksHtml = tasks.map(function(task) {
                        return '<div class="task-item">' +
                            '<div class="task-header">' +
                                '<span class="task-key">' + task.key + '</span>' +
                                '<span class="task-status status-' + task.fields.status.name.toLowerCase().replace(' ', '-') + '">' + task.fields.status.name + '</span>' +
                            '</div>' +
                            '<div class="task-title">' + task.fields.summary + '</div>' +
                            '<div class="task-meta">' +
                                (task.fields.assignee ? '<span class="task-assignee">👤 ' + task.fields.assignee.displayName + '</span>' : '') +
                                (task.fields.priority ? '<span class="task-priority">⚡ ' + task.fields.priority.name + '</span>' : '') +
                            '</div>' +
                        '</div>';
                    }).join('');

                    tasksListEl.innerHTML = tasksHtml;
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

        // Load tasks from Jira
        this.loadTasks();
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
        }
    }
}
