import * as vscode from 'vscode';
import { createTeam, joinTeam, getUserTeams, type TeamWithMembership } from '../services/team-service';

/**
 * Provides the webview panel for Agent-specific features (separate from Live Share).
 * Shows Team & Product Management and the Agent chat box.
 */
export class AgentPanelProvider implements vscode.WebviewViewProvider {
    /** The unique identifier for this webview view type */
    public static readonly viewType = 'collabAgent.agentPanel';

    /** The webview view instance for displaying the panel */
    private _view?: vscode.WebviewView;

    /** Global state keys */
    private readonly _teamStateKey = 'collabAgent.currentTeam';
    
    /** Current teams cache */
    private _userTeams: TeamWithMembership[] = [];

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {}

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Initialize with team info from database
        await this.refreshTeams();

        webviewView.webview.onDidReceiveMessage((message: any) => {
            console.log('AgentPanel received message:', message);
            switch (message.command) {
                case 'createTeam':
                    console.log('Handling createTeam command');
                    this.handleCreateTeam();
                    break;
                case 'joinTeam':
                    console.log('Handling joinTeam command');
                    this.handleJoinTeam();
                    break;
                case 'switchTeam':
                    console.log('Handling switchTeam command');
                    this.handleSwitchTeam();
                    break;
                case 'refreshTeams':
                    console.log('Handling refreshTeams command');
                    this.refreshTeams();
                    break;
                case 'aiQuery':
                    console.log('Handling aiQuery command');
                    this.handleAiQuery(message.text);
                    break;
                default:
                    console.log('Unknown command received:', message.command);
                    break;
            }
        });
    }

    /**
     * Refreshes teams from database and updates UI
     */
    private async refreshTeams() {
        const result = await getUserTeams();
        if (result.error) {
            vscode.window.showErrorMessage(`Failed to load teams: ${result.error}`);
            this._userTeams = [];
        } else {
            this._userTeams = result.teams || [];
        }
        this.postTeamInfo();
    }

    /**
     * Posts current team info to webview
     */
    private postTeamInfo() {
        // Get currently selected team from storage or default to first team
        const currentTeamId = this._context.globalState.get<string>(this._teamStateKey);
        let currentTeam = this._userTeams.find(t => t.id === currentTeamId);
        
        // If no stored team or team not found, use first available team
        if (!currentTeam && this._userTeams.length > 0) {
            currentTeam = this._userTeams[0];
            this._context.globalState.update(this._teamStateKey, currentTeam.id);
        }

        const teamInfo = currentTeam 
            ? { 
                name: currentTeam.lobby_name, 
                role: currentTeam.role === 'admin' ? 'Admin' : 'Member',
                joinCode: currentTeam.join_code,
                id: currentTeam.id
              }
            : { name: 'No Team', role: '—', joinCode: '', id: '' };

        this._view?.webview.postMessage({
            command: 'updateTeamInfo',
            team: teamInfo,
            allTeams: this._userTeams.map(t => ({
                id: t.id,
                name: t.lobby_name,
                role: t.role === 'admin' ? 'Admin' : 'Member',
                joinCode: t.join_code
            }))
        });
    }

    /**
     * Handles team creation with database persistence
     */
    private async handleCreateTeam() {
        const name = await vscode.window.showInputBox({ 
            prompt: 'Enter new team name',
            placeHolder: 'My Team',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Team name cannot be empty';
                }
                if (value.trim().length > 50) {
                    return 'Team name must be 50 characters or less';
                }
                return null;
            }
        });
        
        if (!name?.trim()) return;

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating team...',
            cancellable: false
        }, async () => {
            const result = await createTeam(name.trim());
            
            if (result.error) {
                vscode.window.showErrorMessage(`Failed to create team: ${result.error}`);
            } else if (result.team && result.joinCode) {
                vscode.window.showInformationMessage(
                    `Created team "${result.team.lobby_name}" with join code: ${result.joinCode}`,
                    'Copy Join Code'
                ).then(action => {
                    if (action === 'Copy Join Code') {
                        vscode.env.clipboard.writeText(result.joinCode!);
                        vscode.window.showInformationMessage('Join code copied to clipboard');
                    }
                });
                
                // Refresh teams and set new team as current
                await this.refreshTeams();
                if (result.team) {
                    await this._context.globalState.update(this._teamStateKey, result.team.id);
                    this.postTeamInfo();
                }
            }
        });
    }

    /**
     * Handles joining a team by join code
     */
    private async handleJoinTeam() {
        const joinCode = await vscode.window.showInputBox({ 
            prompt: 'Enter 6-character team join code',
            placeHolder: 'ABC123',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Join code cannot be empty';
                }
                if (value.trim().length !== 6) {
                    return 'Join code must be exactly 6 characters';
                }
                if (!/^[A-Z0-9]+$/i.test(value.trim())) {
                    return 'Join code must contain only letters and numbers';
                }
                return null;
            }
        });
        
        if (!joinCode?.trim()) return;

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Joining team...',
            cancellable: false
        }, async () => {
            const result = await joinTeam(joinCode.trim());
            
            if (result.error) {
                vscode.window.showErrorMessage(`Failed to join team: ${result.error}`);
            } else if (result.team) {
                vscode.window.showInformationMessage(`Successfully joined team "${result.team.lobby_name}"`);
                
                // Refresh teams and set new team as current
                await this.refreshTeams();
                await this._context.globalState.update(this._teamStateKey, result.team.id);
                this.postTeamInfo();
            }
        });
    }

    /**
     * Handles switching between user's teams
     */
    private async handleSwitchTeam() {
        if (this._userTeams.length === 0) {
            vscode.window.showInformationMessage('You are not a member of any teams. Create or join a team first.');
            return;
        }

        if (this._userTeams.length === 1) {
            vscode.window.showInformationMessage('You only belong to one team.');
            return;
        }

        const teamOptions = this._userTeams.map(team => ({
            label: team.lobby_name,
            description: `${team.role === 'admin' ? 'Admin' : 'Member'} • Code: ${team.join_code}`,
            team: team
        }));

        const selected = await vscode.window.showQuickPick(teamOptions, {
            placeHolder: 'Select a team to switch to'
        });

        if (selected) {
            await this._context.globalState.update(this._teamStateKey, selected.team.id);
            vscode.window.showInformationMessage(`Switched to team "${selected.team.lobby_name}"`);
            this.postTeamInfo();
        }
    }

    private handleAiQuery(text: string) {
        const reply = `Agent received: "${text}"`;
        this._view?.webview.postMessage({ command: 'aiResponse', text: reply });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'agentPanel.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.css'));
        const nonce = Date.now().toString();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Agent Panel</title>
            <link href="${styleUri}" rel="stylesheet" />
        </head>
        <body>
            <div class="agent-heading">Agent</div>
            <div class="section">
                <div class="section-title">🏢 Team & Product Management</div>
                <div id="teamProduct">
                    <div><strong>Current Team:</strong> <span id="teamName">—</span></div>
                    <div><strong>Your Role:</strong> <span id="teamRole">—</span></div>
                    <div id="joinCodeSection" style="display:none;">
                        <strong>Join Code:</strong> 
                        <span id="teamJoinCode">—</span>
                        <button class="button-small" id="copyJoinCodeBtn" title="Copy join code">📋</button>
                    </div>
                    <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="button" id="switchTeamBtn">Switch Team</button>
                        <button class="button" id="createTeamBtn">Create Team</button>
                        <button class="button" id="joinTeamBtn">Join Team</button>
                        <button class="button-small" id="refreshTeamsBtn" title="Refresh teams">🔄</button>
                    </div>
                </div>
            </div>

            <div id="ai-agent-box" class="section">
                <h3>AI Agent</h3>
                <div id="ai-chat-log" class="chat-log"></div>
                <div class="chat-input-container">
                    <input type="text" id="ai-chat-input" placeholder="Ask the agent..." />
                    <button id="ai-chat-send">Send</button>
                </div>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
