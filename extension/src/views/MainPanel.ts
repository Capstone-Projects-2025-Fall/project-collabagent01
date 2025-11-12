import * as vscode from 'vscode';
import { LiveShareManager } from './LiveSharePanel';
import { AgentPanelProvider } from './AgentPanel';
import { HomeScreenPanel } from './HomeScreenPanel';
import { TasksPanel } from './TasksPanel';
import { ProfilePanel } from './ProfilePanel';

/**
 * Main orchestrator panel that manages and displays five sub-panels:
 * - Home Screen (authentication, welcome, user info)
 * - Live Share (collaboration sessions, team messaging)
 * - Agent Panel (team management, AI chat bot)
 * - Tasks Panel (Jira task integration)
 * - Profile (user profile and preferences)
 */
export class CollabAgentPanelProvider implements vscode.WebviewViewProvider {
    /** The unique identifier for this webview view type */
    public static readonly viewType = 'collabAgent.teamActivity';

    /** The webview view instance for displaying the panel */
    private _view?: vscode.WebviewView;
    
    /** Live Share manager instance for Live Share functionality */
    private _liveShareManager: LiveShareManager;
    
    /** Agent panel provider instance for agent functionality */  
    private _agentPanel: AgentPanelProvider;
    
    /** Home screen panel instance for home functionality */
    private _homeScreen: HomeScreenPanel;

    /** Tasks panel instance for Jira task integration */
    private _tasksPanel: TasksPanel;

    /** Profile panel instance for user profile management */
    private _profilePanel: ProfilePanel;

    /** Interval to monitor auth state changes */
    private _authMonitorInterval: any | undefined;
    /** Cached last known auth state */
    private _lastAuthState: boolean | undefined;

    /**
     * Creates a new MainPanel orchestrator instance.
     * 
     * @param _extensionUri - The URI of the extension for loading resources
     * @param _context - The extension context for state management
     */
    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {
        this._liveShareManager = new LiveShareManager(this._context);
        this._agentPanel = new AgentPanelProvider(this._extensionUri, this._context);
        this._homeScreen = new HomeScreenPanel(this._extensionUri, this._context);
        this._tasksPanel = new TasksPanel(this._context);
        this._profilePanel = new ProfilePanel(this._extensionUri, this._context);
    }

    /**
     * Resolves the webview view when it becomes visible.
     * Sets up the webview HTML, message handlers, and initializes Live Share.
     * 
     * @param webviewView - The webview view to resolve
     * @param context - The resolution context
     * @param _token - Cancellation token (unused)
     */
    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log("MainPanel: resolveWebviewView called");
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);
        console.log("MainPanel: HTML set, webview should be ready");

        // Set up sub-panels with the webview for delegation
        this._liveShareManager.setView(webviewView);
        this._agentPanel.setWebviewForDelegation(webviewView);
        this._tasksPanel.setWebview(webviewView);

        await this._liveShareManager.initializeLiveShare();
        await this._agentPanel.refreshTeamsList(); // Initialize agent teams
        await this._tasksPanel.initializePanel(); // Initialize tasks panel
        this.startAuthMonitor();

        webviewView.webview.onDidReceiveMessage(
            async (message: any) => {
                console.log('MainPanel received message:', message);
                
                // Delegate Live Share commands to LiveShareManager
                if (this.isLiveShareCommand(message.command)) {
                    await this.handleLiveShareMessage(message);
                    return;
                }
                
                // Delegate Agent commands to AgentPanel
                if (this.isAgentCommand(message.command)) {
                    await this.handleAgentMessage(message);
                    return;
                }

                // Delegate Tasks commands to TasksPanel
                if (this.isTasksCommand(message.command)) {
                    await this.handleTasksMessage(message);
                    return;
                }

                // Delegate Profile commands to Profile handlers
                if (this.isProfileCommand(message.command)) {
                    await this.handleProfileMessage(message);
                    return;
                }

                // Handle Home/Auth commands directly in MainPanel
                switch (message.command) {
                    case 'loginOrSignup':
                        await this.handleLoginOrSignup();
                        return;
                    case 'installLiveShare':
                        await this.handleInstallLiveShare();
                        return;
                    default:
                        console.log('Unknown command received in MainPanel:', message.command);
                }
            },
            undefined,
            []
        );
    }

    /** Check if a command is related to Live Share functionality */
    private isLiveShareCommand(command: string): boolean {
        return [
            'startLiveShare',
            'joinLiveShare', 
            'endLiveShare',
            'leaveLiveShare',
            'sendTeamMessage',
            'manualSetInviteLink',
            'manualClearInviteLink',
            'requestStoredLink',
            'manualPasteInviteLink'
        ].includes(command);
    }

    /** Check if a command is related to Agent functionality */
    private isAgentCommand(command: string): boolean {
        return [
            'createTeam',
            'joinTeam',
            'switchTeam',
            'refreshTeams',
            'deleteTeam',
            'leaveTeam',
            'aiQuery',
            'addFileSnapshot',
            // 'generateSummary' removed - edge function now handles automatic summarization
            'loadActivityFeed'
        ].includes(command);
    }

    /** Check if a command is related to Tasks functionality */
    private isTasksCommand(command: string): boolean {
        return [
            'tasksWebviewReady',
            'connectJira',
            'connectJiraWithCredentials',
            'disconnectJira',
            'refreshTasks',
            'retryTasks',
            'loadSprint',
            'loadBacklog',
            'transitionIssue',
            'createTask',
            'getAISuggestions'
        ].includes(command);
    }

    /** Check if a command is related to Profile functionality */
    private isProfileCommand(command: string): boolean {
        return [
            'saveProfile',
            'loadProfile',
            'deleteAccount'
        ].includes(command);
    }

    /** Delegate Live Share message to LiveShareManager */
    private async handleLiveShareMessage(message: any) {
        switch (message.command) {
            case 'startLiveShare':
                this._liveShareManager.startLiveShareSession();
                break;
            case 'joinLiveShare':
                this._liveShareManager.joinLiveShareSession();
                break;
            case 'endLiveShare':
                this._liveShareManager.endLiveShareSession();
                break;
            case 'leaveLiveShare':
                this._liveShareManager.leaveLiveShareSession();
                break;
            case 'sendTeamMessage':
                this._liveShareManager.sendTeamMessage(message.text);
                break;
            case 'manualSetInviteLink':
                this._liveShareManager.setManualInviteLink(message.link);
                break;
            case 'manualClearInviteLink':
                this._liveShareManager.clearManualInviteLink();
                break;
            case 'requestStoredLink':
                this._liveShareManager.sendStoredLinkToWebview();
                break;
            case 'manualPasteInviteLink':
                this._liveShareManager.pasteInviteLinkFromClipboard();
                break;
        }
    }

    /** Delegate Agent message to AgentPanel */
    private async handleAgentMessage(message: any) {
        console.log('Agent command delegated:', message.command);

        switch (message.command) {
            case 'createTeam':
                await this._agentPanel.createTeam();
                break;
            case 'joinTeam':
                await this._agentPanel.joinTeam();
                break;
            case 'switchTeam':
                await this._agentPanel.switchTeam();
                break;
            case 'refreshTeams':
                await this._agentPanel.refreshTeamsList();
                break;
            case 'deleteTeam':
                await (this._agentPanel as any).handleDeleteTeam?.();
                // If private, call public via message delegation pattern
                if (!(this._agentPanel as any).handleDeleteTeam) {
                    // Fallback: send message to AgentPanel's own handler via webview
                    this._view?.webview.postMessage({ command: 'deleteTeam' });
                }
                break;
            case 'leaveTeam':
                await (this._agentPanel as any).handleLeaveTeam?.();
                if (!(this._agentPanel as any).handleLeaveTeam) {
                    this._view?.webview.postMessage({ command: 'leaveTeam' });
                }
                break;
            case 'aiQuery':
                await this._agentPanel.processAiQuery(message.text);
                break;
            case 'addFileSnapshot':
                await (this._agentPanel as any).addFileSnapshot?.(message.payload);
                break;
            // generateSummary case removed - edge function now handles automatic summarization
            case 'loadActivityFeed':
                await (this._agentPanel as any).loadActivityFeed?.(message.teamId, message.limit);
                break;
            default:
                console.log('Unknown agent command:', message.command);
        }
    }

    /** Delegate Tasks message to TasksPanel */
    private async handleTasksMessage(message: any) {
        console.log('Tasks command delegated:', message.command);

        switch (message.command) {
            case 'tasksWebviewReady':
                // Webview is ready, refresh panel state
                await this._tasksPanel.updatePanelState();
                break;
            case 'connectJira':
                await this._tasksPanel.handleConnectJira();
                break;
            case 'connectJiraWithCredentials':
                await this._tasksPanel.handleConnectJiraWithCredentials(message.jiraUrl, message.jiraEmail, message.jiraToken);
                break;
            case 'disconnectJira':
                await this._tasksPanel.handleDisconnectJira();
                break;
            case 'refreshTasks':
                await this._tasksPanel.handleRefreshTasks();
                break;
            case 'retryTasks':
                await this._tasksPanel.handleRefreshTasks();
                break;
            case 'loadSprint':
                await this._tasksPanel.handleLoadSprint(message.sprintId);
                break;
            case 'loadBacklog':
                await this._tasksPanel.handleLoadBacklog();
                break;
            case 'transitionIssue':
                await this._tasksPanel.handleTransitionIssue(message.issueKey, message.targetStatus);
                break;
            case 'createTask':
                await this._tasksPanel.handleCreateTask(message.taskData);
                break;
            case 'getAISuggestions':
                await this._tasksPanel.handleGetAISuggestions();
                break;
            default:
                console.log('Unknown tasks command:', message.command);
        }
    }

    /** Delegate Profile message to Profile handlers */
    private async handleProfileMessage(message: any) {
        console.log('Profile command received:', message.command);

        switch (message.command) {
            case 'saveProfile':
                await this.handleSaveProfile(message.profileData);
                break;
            case 'loadProfile':
                await this.handleLoadProfile();
                break;
            case 'deleteAccount':
                await this.handleDeleteAccount();
                break;
            default:
                console.log('Unknown profile command:', message.command);
        }
    }

    private async handleSaveProfile(profileData: any) {
        try {
            const { getAuthContext } = require('../services/auth-service');
            const authResult = await getAuthContext();

            if (!authResult || !authResult.context || !authResult.context.isAuthenticated) {
                vscode.window.showErrorMessage('You must be logged in to save your profile.');
                return;
            }

            const user = authResult.context;
            const { BASE_URL } = require('../api/types/endpoints');

            const payload = {
                user_id: user.id,
                name: profileData.name || '',
                interests: profileData.interests || [],
                strengths: profileData.strengths || [],
                weaknesses: profileData.weaknesses || [],
                custom_skills: profileData.custom_skills || []
            };

            const token = user.auth_token || user.id || 'no-token-available';

            const response = await fetch(`${BASE_URL}/api/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                vscode.window.showInformationMessage('Profile saved successfully!');
                this._view?.webview.postMessage({
                    command: 'profileSaved',
                    success: true,
                    profile: result.profile
                });
            } else {
                const error = await response.text();
                vscode.window.showErrorMessage(`Failed to save profile: ${error}`);
                this._view?.webview.postMessage({
                    command: 'profileSaved',
                    success: false,
                    error: error
                });
            }
        } catch (err) {
            console.error('Error saving profile:', err);
            vscode.window.showErrorMessage('Error saving profile. Please try again.');
            this._view?.webview.postMessage({
                command: 'profileSaved',
                success: false,
                error: String(err)
            });
        }
    }

    private async handleLoadProfile() {
        try {
            const { getAuthContext, setAuthContext } = require('../services/auth-service');
            const authResult = await getAuthContext();

            if (!authResult || !authResult.context || !authResult.context.isAuthenticated) {
                console.log('User not authenticated, cannot load profile');
                this._view?.webview.postMessage({
                    command: 'profileLoadError',
                    error: 'Not authenticated'
                });
                return;
            }

            let user = authResult.context;

            // Migration fix: If auth_token is missing, try to get it from Supabase session
            if (!user.auth_token) {
                console.log('Auth token missing, attempting to refresh from Supabase session...');
                const { getSupabase } = require('../auth/supabaseClient');
                const supabase = getSupabase();
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData?.session?.access_token;

                if (token) {
                    console.log('Found token in Supabase session, refreshing user data...');
                    const { getUserByID } = require('../api/user-api');
                    const { user: refreshedUser, error: refreshError } = await getUserByID(token);

                    if (!refreshError && refreshedUser) {
                        await setAuthContext(refreshedUser);
                        user = refreshedUser;
                        console.log('User context refreshed with auth_token');
                    } else {
                        console.error('Failed to refresh user data:', refreshError);
                        this._view?.webview.postMessage({
                            command: 'profileLoadError',
                            error: 'Failed to refresh authentication'
                        });
                        return;
                    }
                } else {
                    console.error('No token found in Supabase session');
                    this._view?.webview.postMessage({
                        command: 'profileLoadError',
                        error: 'Auth token missing - please sign out and sign in again'
                    });
                    return;
                }
            }

            const { BASE_URL } = require('../api/types/endpoints');

            const response = await fetch(`${BASE_URL}/api/profile?user_id=${user.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${user.auth_token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Profile loaded successfully');
                this._view?.webview.postMessage({
                    command: 'profileLoaded',
                    profile: result.profile
                });
            } else {
                const errorText = await response.text();
                console.error('Failed to load profile:', errorText);
                this._view?.webview.postMessage({
                    command: 'profileLoadError',
                    error: errorText
                });
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            this._view?.webview.postMessage({
                command: 'profileLoadError',
                error: err instanceof Error ? err.message : 'Unknown error'
            });
        }
    }

    private async handleDeleteAccount() {
        try {
            const { getAuthContext } = require('../services/auth-service');
            const authResult = await getAuthContext();

            if (!authResult || !authResult.context || !authResult.context.isAuthenticated) {
                vscode.window.showErrorMessage('You must be logged in to delete your account.');
                return;
            }

            const user = authResult.context;
            const { getSupabase } = require('../auth/supabaseClient');
            const supabase = getSupabase();

            // Delete the user from auth.users table (Supabase Admin API)
            const { error } = await supabase.auth.admin.deleteUser(user.id);

            if (error) {
                console.error('Error deleting account:', error);
                vscode.window.showErrorMessage(`Failed to delete account: ${error.message}`);
                this._view?.webview.postMessage({
                    command: 'accountDeleted',
                    success: false,
                    error: error.message
                });
            } else {
                // Sign out the user locally
                await supabase.auth.signOut();

                vscode.window.showInformationMessage('Your account has been successfully deleted.');
                this._view?.webview.postMessage({
                    command: 'accountDeleted',
                    success: true
                });

                // Refresh the panel to show logged-out state
                await vscode.commands.executeCommand('collabAgent.refreshPanel');
            }
        } catch (err) {
            console.error('Error deleting account:', err);
            vscode.window.showErrorMessage('Error deleting account. Please try again.');
            this._view?.webview.postMessage({
                command: 'accountDeleted',
                success: false,
                error: String(err)
            });
        }
    }

    /** Handle login/signup authentication */
    private async handleLoginOrSignup() {
        try {
            const { signInOrUpMenu } = require('../services/auth-service');
            await signInOrUpMenu();
            // Small delay to allow auth state to persist
            await new Promise(resolve => setTimeout(resolve, 300));
            // Refresh the panel HTML to reflect logged-in status
            if (this._view) {
                this._view.webview.html = await this._getHtmlForWebview(this._view.webview);
            }
        } catch (err) {
            let msg = 'Failed to start login/signup flow.';
            if (err && typeof err === 'object') {
                if ('message' in err && typeof (err as any).message === 'string') {
                    msg += ' ' + (err as any).message;
                } else {
                    msg += ' ' + JSON.stringify(err);
                }
            } else if (typeof err === 'string') {
                msg += ' ' + err;
            }
            vscode.window.showErrorMessage(msg);
        }
    }

    /** Handle Live Share extension installation */
    private async handleInstallLiveShare() {
        await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-vsliveshare.vsliveshare');
        vscode.window.showInformationMessage('Live Share extension installation triggered. Reloading to finalize installation...');
        // Inform webview before reload
        this._view?.webview.postMessage({ command: 'liveShareInstalling' });
        // Small delay to allow message to render
        await new Promise(resolve => setTimeout(resolve, 500));
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }

    /** Starts monitoring auth state and refreshes panel on changes */
    private startAuthMonitor() {
        this.stopAuthMonitor();
        this._authMonitorInterval = setInterval(async () => {
            try {
                const { getAuthContext } = require('../services/auth-service');
                const result = await getAuthContext();
                const isAuthed = !!(result && result.context && result.context.isAuthenticated);
                if (this._lastAuthState === undefined) {
                    this._lastAuthState = isAuthed;
                } else if (this._lastAuthState !== isAuthed) {
                    this._lastAuthState = isAuthed;
                    if (this._view) {
                        // Send auth state update to webview for immediate UI response
                        this._view.webview.postMessage({ 
                            command: 'updateAuthState', 
                            authenticated: isAuthed 
                        });
                        // Rebuild HTML to update Home tab login status
                        this._view.webview.html = await this._getHtmlForWebview(this._view.webview);
                    }
                }
            } catch {
                // ignore transient errors
            }
        }, 2000);
    }

    /** Stops monitoring auth state */
    private stopAuthMonitor() {
        if (this._authMonitorInterval) {
            clearInterval(this._authMonitorInterval);
            this._authMonitorInterval = undefined;
        }
    }

    /**
     * Updates team activity information (delegated to Live Share manager).
     * 
     * @param activity - The activity data to update
     */
    public updateTeamActivity(activity: any) {
        this._liveShareManager.updateTeamActivity(activity);
    }

    /**
     * Disposes of the panel provider and cleans up resources.
     * Stops monitoring intervals and clears references to sub-panels.
     */
    dispose() {
        this._liveShareManager.dispose();
        // AgentPanel doesn't have dispose method yet
        // if (this._agentPanel.dispose) this._agentPanel.dispose();
        this.stopAuthMonitor();
        
        this._view = undefined;
    }
    
    /**
     * Generates the HTML content for the webview panel.
     * 
     * @param webview - The webview instance for generating resource URIs
     * @returns The complete HTML string for the panel
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        // Build HTML from external template and dynamic sections
        return (async () => {
            // Dynamically check Live Share install status
            let liveShareInstalled = false;
            try {
                liveShareInstalled = !!vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
            } catch {}

            // Dynamically check login status
            let loggedIn = false;
            let userInfo = undefined;
            try {
                const { getAuthContext } = require('../services/auth-service');
                const result = await getAuthContext();
                if (result && result.context && result.context.isAuthenticated) {
                    loggedIn = true;
                    userInfo = { email: result.context.email, username: result.context.first_name };
                }
            } catch {}

            // Get HTML content from sub-panels
            const homeHtml = await this._homeScreen.getHtml(webview, liveShareInstalled, loggedIn, userInfo);
            const agentHtml = this._agentPanel.getInnerHtml();
            const tasksHtml = this._tasksPanel.getHtml();
            const profileHtml = await this._profilePanel.getHtml(webview);
            
            // Get Live Share panel content
            const fs = require('fs');
            const liveShareContentPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'liveSharePanel.html').fsPath;
            let liveShareHtml = '';
            try {
                liveShareHtml = fs.readFileSync(liveShareContentPath, 'utf8');
            } catch (e) {
                console.warn('Failed to read liveSharePanel.html:', e);
                liveShareHtml = '<div>Failed to load Live Share panel.</div>';
            }
            
            const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'liveSharePanel.js'));
            const mainStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'mainPanel.css'));
            const liveShareStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'liveSharePanel.css'));
            const agentStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'agentPanel.css'));
            const tasksStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'tasksPanel.css'));
            const profileStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'profilePanel.css'));
            const nonce = Date.now().toString();

            // Load main panel template
            const templatePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'mainPanel.html').fsPath;
            let template = '';
            try {
                template = fs.readFileSync(templatePath, 'utf8');
            } catch (e) {
                console.warn('Failed to read liveSharePanel.html, falling back to inline HTML:', e);
                return `<html><body>Failed to load template.</body></html>`;
            }

            const html = template
                .replace('{{MAIN_STYLE_URI}}', mainStyleUri.toString())
                .replace('{{LIVESHARE_STYLE_URI}}', liveShareStyleUri.toString())
                .replace('{{AGENT_STYLE_URI}}', agentStyleUri.toString())
                .replace('{{TASKS_STYLE_URI}}', tasksStyleUri.toString())
                .replace('{{PROFILE_STYLE_URI}}', profileStyleUri.toString())
                .replace('{{SCRIPT_URI}}', scriptUri.toString())
                .replace(/\{\{NONCE\}\}/g, nonce)
                .replace('{{IS_AUTHENTICATED}}', loggedIn.toString())
                .replace('{{LIVESHARE_INSTALLED}}', liveShareInstalled.toString())
                .replace('{{HOME_HTML}}', homeHtml)
                .replace('{{LIVESHARE_HTML}}', liveShareHtml)
                .replace('{{AGENT_HTML}}', agentHtml)
                .replace('{{TASKS_HTML}}', tasksHtml)
                .replace('{{PROFILE_HTML}}', profileHtml);

            return html;
        })();
    }
}
