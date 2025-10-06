import * as vscode from 'vscode';

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

        // Initialize with stored team info
        this.postTeamInfo();

        webviewView.webview.onDidReceiveMessage((message: any) => {
            switch (message.command) {
                case 'createTeam':
                    this.createTeam();
                    break;
                case 'joinTeam':
                    this.joinTeam();
                    break;
                case 'switchTeam':
                    this.switchTeam();
                    break;
                case 'aiQuery':
                    this.handleAiQuery(message.text);
                    break;
                default:
                    // noop
                    break;
            }
        });
    }

    private postTeamInfo() {
        const team = this._context.globalState.get<{ name: string; role: string }>(this._teamStateKey) || { name: 'No Team', role: '—' };
        this._view?.webview.postMessage({
            command: 'updateTeamInfo',
            team
        });
    }

    private async createTeam() {
        const name = await vscode.window.showInputBox({ prompt: 'Enter new team name' });
        if (!name) return;
        const team = { name, role: 'Owner' };
        await this._context.globalState.update(this._teamStateKey, team);
        vscode.window.showInformationMessage(`Created team "${name}"`);
        this.postTeamInfo();
    }

    private async joinTeam() {
        const name = await vscode.window.showInputBox({ prompt: 'Enter team name to join' });
        if (!name) return;
        const team = { name, role: 'Member' };
        await this._context.globalState.update(this._teamStateKey, team);
        vscode.window.showInformationMessage(`Joined team "${name}"`);
        this.postTeamInfo();
    }

    private async switchTeam() {
        const name = await vscode.window.showInputBox({ prompt: 'Enter team name to switch to' });
        if (!name) return;
        const current = this._context.globalState.get<{ name: string; role: string }>(this._teamStateKey);
        const team = { name, role: current?.role ?? 'Member' };
        await this._context.globalState.update(this._teamStateKey, team);
        vscode.window.showInformationMessage(`Switched to team "${name}"`);
        this.postTeamInfo();
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
                    <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="button" id="switchTeamBtn">Switch Team</button>
                        <button class="button" id="createTeamBtn">Create Team</button>
                        <button class="button" id="joinTeamBtn">Join Team</button>
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
