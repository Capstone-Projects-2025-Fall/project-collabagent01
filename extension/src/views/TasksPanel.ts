import * as vscode from 'vscode';
import { JiraService } from '../services/jira-service';
import * as fs from 'fs';
import * as path from 'path';

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
        // Read HTML from external file
        const htmlPath = path.join(this._context.extensionPath, 'media', 'tasksPanel.html');
        let htmlContent = '';
        try {
            htmlContent = fs.readFileSync(htmlPath, 'utf8');
        } catch (e) {
            console.error('Failed to read tasksPanel.html:', e);
            return '<div>Failed to load Tasks panel.</div>';
        }

        // Read JavaScript from external file
        const jsPath = path.join(this._context.extensionPath, 'media', 'tasksPanel.js');
        let jsContent = '';
        try {
            jsContent = fs.readFileSync(jsPath, 'utf8');
        } catch (e) {
            console.error('Failed to read tasksPanel.js:', e);
            jsContent = '';
        }

        return `${htmlContent}
            <script>
            ${jsContent}
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
                tasks: issues,
                isAdmin: this._currentUserRole === 'admin'
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
     * Handles Jira connection with credentials provided directly from the form.
     */
    public async handleConnectJiraWithCredentials(jiraUrl: string, jiraEmail: string, jiraToken: string) {
        // Security check: Only admins can connect Jira
        if (!this._currentTeamId || this._currentUserRole !== 'admin') {
            this._view?.webview.postMessage({
                command: 'jiraConnectionFailed',
                error: 'Only team admins can configure Jira integration'
            });
            return;
        }

        try {
            const jiraService = JiraService.getInstance();

            // Get current user ID
            const { getAuthContext } = require('../services/auth-service');
            const authResult = await getAuthContext();
            const adminUserId = authResult?.context?.id;

            if (!adminUserId) {
                throw new Error('Unable to get user authentication context');
            }

            // Call the service method that handles the full flow with provided credentials
            await jiraService.connectWithCredentials(this._currentTeamId, adminUserId, jiraUrl, jiraEmail, jiraToken);

            // Send success message to webview
            this._view?.webview.postMessage({
                command: 'jiraConnected'
            });

            // Refresh state after successful connection
            await this.refreshTeamState();
            this.updateUI();

        } catch (error) {
            console.error('Failed to connect Jira with credentials:', error);
            this._view?.webview.postMessage({
                command: 'jiraConnectionFailed',
                error: error instanceof Error ? error.message : 'Failed to connect to Jira'
            });
        }
    }

    /**
     * Handles disconnecting from Jira (admin only).
     */
    public async handleDisconnectJira() {
        // Security check: Only admins can disconnect Jira
        if (!this._currentTeamId || this._currentUserRole !== 'admin') {
            vscode.window.showErrorMessage('Only team admins can disconnect Jira integration');
            return;
        }

        // Show confirmation dialog
        const confirmation = await vscode.window.showWarningMessage(
            'Are you sure you want to disconnect from Jira? This will remove the Jira integration for your team.',
            { modal: true },
            'Disconnect',
            'Cancel'
        );

        if (confirmation !== 'Disconnect') {
            return;
        }

        try {
            const jiraService = JiraService.getInstance();
            await jiraService.disconnectJira(this._currentTeamId);

            vscode.window.showInformationMessage('Successfully disconnected from Jira');

            // Refresh state to show setup UI again
            await this.refreshTeamState();
            this.updateUI();

        } catch (error) {
            console.error('Failed to disconnect Jira:', error);
            vscode.window.showErrorMessage(
                error instanceof Error ? error.message : 'Failed to disconnect from Jira'
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

    /**
     * Handles creating a new Jira task.
     */
    public async handleCreateTask(taskData: any) {
        if (!this._currentTeamId || !this._view) {
            vscode.window.showErrorMessage('No team selected or view not available.');
            this._view?.webview.postMessage({ command: 'taskCreationFailed' });
            return;
        }

        try {
            const jiraService = JiraService.getInstance();

            // Create the issue in Jira
            const newIssue = await jiraService.createIssue(this._currentTeamId, taskData);

            // Show success message with the issue key
            vscode.window.showInformationMessage(`✅ Task created successfully: ${newIssue.key}`);

            // Notify webview of success
            this._view.webview.postMessage({ command: 'taskCreated' });

            // Refresh the task list to show the new task
            await this.handleRefreshTasks();

        } catch (error) {
            console.error('Failed to create task:', error);
            vscode.window.showErrorMessage(
                `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
            );

            // Notify webview of failure
            this._view?.webview.postMessage({ command: 'taskCreationFailed' });
        }
    }

    /**
     * Handles AI task recommendations for unassigned tasks.
     * Fetches unassigned tasks, calls AI API to get recommendations,
     * and posts them to the team activity timeline.
     */
    public async handleGetAISuggestions() {
        if (!this._currentTeamId || !this._view) {
            vscode.window.showErrorMessage('No team selected or view not available.');
            this._view?.webview.postMessage({ command: 'aiSuggestionsFailed' });
            return;
        }

        try {
            // Show loading message
            vscode.window.showInformationMessage('Analyzing unassigned tasks...');

            const jiraService = JiraService.getInstance();

            // Fetch all team issues
            const allIssues = await jiraService.fetchTeamIssues(this._currentTeamId);

            // Filter for unassigned tasks
            const unassignedTasks = allIssues.filter(issue => !issue.fields.assignee);

            if (unassignedTasks.length === 0) {
                vscode.window.showInformationMessage('No unassigned tasks found.');
                this._view.webview.postMessage({ command: 'aiSuggestionsComplete' });
                return;
            }

            // Get current user ID for the API call
            const { getAuthContext } = require('../services/auth-service');
            const authResult = await getAuthContext();
            const userId = authResult?.context?.id;

            if (!userId) {
                throw new Error('Unable to get user authentication context');
            }

            // Prepare task data for AI analysis
            const tasksForAI = unassignedTasks.map(task => ({
                key: task.key,
                summary: task.fields.summary,
                description: task.fields.description || ''
            }));

            // Call the AI recommendations API
            // Note: Update BACKEND_URL in src/config/backend-config.ts after deploying to Render
            const { getApiUrl } = require('../config/backend-config');
            const response = await fetch(getApiUrl('/api/ai/task_recommendations'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    team_id: this._currentTeamId,
                    user_id: userId,
                    unassigned_tasks: tasksForAI
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get AI recommendations');
            }

            const result = await response.json();

            // Show success message
            if (result.recommendations_count > 0) {
                vscode.window.showInformationMessage(
                    `✅ AI posted ${result.recommendations_count} task recommendation(s) to the timeline!`
                );
            } else {
                vscode.window.showInformationMessage(
                    'AI analysis complete, but no recommendations were generated.'
                );
            }

            // Notify webview that operation is complete
            this._view.webview.postMessage({ command: 'aiSuggestionsComplete' });

        } catch (error) {
            console.error('Failed to get AI suggestions:', error);
            vscode.window.showErrorMessage(
                `Failed to get AI suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
            );

            // Notify webview that operation failed
            this._view?.webview.postMessage({ command: 'aiSuggestionsFailed' });
        }
    }
}
