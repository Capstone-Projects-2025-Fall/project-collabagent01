import * as vscode from 'vscode';
import { LiveShareManager } from './LiveSharePanel';
import { AgentPanelProvider } from './AgentPanel';
import { HomeScreenPanel } from './HomeScreenPanel';
import { getPresenceService } from '../services/presence-service';
import { getCollaborationNotificationManager } from '../services/collaboration-notifications';

/**
 * Main orchestrator panel that manages and displays three sub-panels:
 * - Home Screen (authentication, welcome, user info)
 * - Live Share (collaboration sessions, team messaging)
 * - Agent Panel (team management, AI chat bot)
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

        await this._liveShareManager.initializeLiveShare();
        await this._agentPanel.refreshTeamsList(); // Initialize agent teams

        // Initialize presence tracking for current team (if any)
        await this._agentPanel.startPresenceForCurrentTeam();

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
                .replace('{{SCRIPT_URI}}', scriptUri.toString())
                .replace(/\{\{NONCE\}\}/g, nonce)
                .replace('{{IS_AUTHENTICATED}}', loggedIn.toString())
                .replace('{{LIVESHARE_INSTALLED}}', liveShareInstalled.toString())
                .replace('{{HOME_HTML}}', homeHtml)
                .replace('{{LIVESHARE_HTML}}', liveShareHtml)
                .replace('{{AGENT_HTML}}', agentHtml);

            return html;
        })();
    }
}