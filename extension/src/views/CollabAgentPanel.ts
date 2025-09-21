import * as vscode from 'vscode';
import * as vsls from 'vsls';

export class CollabAgentPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'collabAgent.teamActivity';

    private _view?: vscode.WebviewView;
    private _liveShareApi?: vsls.LiveShare | null = null; 

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log("CollabAgentPanel: resolveWebviewView called");
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log("CollabAgentPanel: HTML set, webview should be ready");

        await this.initializeLiveShare();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'startLiveShare':
                        this.startLiveShareSession();
                        return;
                    case 'joinLiveShare':
                        this.joinLiveShareSession();
                        return;
                    case 'sendTeamMessage':
                        this.sendTeamMessage(message.text);
                        return;
                }
            },
            undefined,
            []
        );
    }

    private async initializeLiveShare(): Promise<boolean> {
        try {
            this._liveShareApi = await vsls.getApi();
            if (this._liveShareApi) {
                console.log('Live Share API initialized successfully.');
                return true;
            } else {
                console.log('Live Share extension not available.');
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize Live Share API:', error);
            return false;
        }
    }

    private async startLiveShareSession() {
        if (!this._liveShareApi) {
            vscode.window.showErrorMessage('Live Share API not available. Please install Live Share extension.');
            return;
        }

        try {
            vscode.window.showInformationMessage('Starting Live Share session...');

            // Start the live share session
            const session = await this._liveShareApi.share();

            if (session && session.toString()) {
                const inviteLink = session.toString();
                vscode.window.showInformationMessage(`Live Share session started! Invite link ${inviteLink}`);

                // UPdate the UI 
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: 'hosting',
                        link: inviteLink
                    });
                }
            } else {
                vscode.window.showErrorMessage('Failed to start Live Share session');
            }
        } catch (error) {
            console.error('Error starting Live Share session:', error);
            vscode.window.showErrorMessage('Error starting Live Share session: ' + error);
        }
    }

    private async joinLiveShareSession() {
        if (!this._liveShareApi) {
            vscode.window.showErrorMessage('Live Share API not available. Please install Live Share extension.');
            return;
        }

        try {
            // Prompt user for invite link 
            const inviteLink = await vscode.window.showInputBox({
                prompt: 'Enter Live Share invite link',
                placeHolder: 'https://prod.liveshare.vsengsaas.visualstudio.com/join?...',
                validateInput: (value) => {
                    if (!value || value.trim().length == 0) {
                        return 'Please enter a valid invite link';
                    }
                    return null;
                }
            });

            if (!inviteLink) {
                return; // User cancelled 
            }

            vscode.window.showInformationMessage('Joining Live Share session...');

            // Join the Live Share session
            const inviteUri = vscode.Uri.parse(inviteLink.trim());
            await this._liveShareApi.join(inviteUri);

            vscode.window.showInformationMessage('Successfully joined Live Share session!');

            // Update UI 
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'joined',
                    link: inviteLink
                });
            }
        } catch (error) {
            console.error('Error joining Live Share session:', error);
            vscode.window.showErrorMessage('Error joining Live Share session: ' + error); 
        }
    }

    private sendTeamMessage(message: string) {
        // Implement team messaging
        vscode.window.showInformationMessage(`Team message: ${message}`);

        if (this._view) {
            this._view.webview.postMessage({
                command: 'addMessage',
                message: message,
                sender: 'You',
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }

    public updateTeamActivity(activity: any) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateActivity',
                activity: activity
            });
        }
    }

    // @ts-ignore
    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Collab Agent</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-sideBar-background);
                    padding: 16px;
                    margin: 0;
                }
                
                .section {
                    margin-bottom: 20px;
                    padding: 12px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    background-color: var(--vscode-editor-background);
                }
                
                .section-title {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-textBlockQuote-foreground);
                }
                
                .button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    margin: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                
                .activity-item {
                    padding: 8px;
                    margin: 4px 0;
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    border-radius: 4px;
                    border-left: 3px solid var(--vscode-textLink-foreground);
                }
                
                .chat-input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 4px;
                    margin-top: 8px;
                }
                
                .chat-messages {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-top: 8px;
                }
                
                .chat-message {
                    padding: 6px;
                    margin: 4px 0;
                    background-color: var(--vscode-textBlockQuote-background);
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--vscode-charts-green);
                    margin-right: 6px;
                }
                
                .offline {
                    background-color: var(--vscode-charts-red);
                }
            </style>
        </head>
        <body>
            <div class="section">
                <div class="section-title">🚀 Live Share Session</div>
                <button class="button" onclick="startLiveShare()">Start Session</button>
                <button class="button" onclick="joinLiveShare()">Join Session</button>
                <div id="sessionStatus">No active session</div>
            </div>
            
            <div class="section">
                <div class="section-title">👥 Team Activity</div>
                <div id="teamActivity">
                    <div class="activity-item">
                        <span class="status-indicator"></span>
                        <strong>You:</strong> Ready to collaborate
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">💬 Team Chat</div>
                <div id="chatMessages" class="chat-messages">
                    <div class="chat-message">
                        <strong>Collab Agent:</strong> Welcome! Start collaborating with your team.
                    </div>
                </div>
                <input type="text" id="chatInput" class="chat-input" placeholder="Type a message to your team..." onkeypress="handleChatInput(event)">
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function startLiveShare() {
                    vscode.postMessage({
                        command: 'startLiveShare'
                    });
                }
                
                function joinLiveShare() {
                    vscode.postMessage({
                        command: 'joinLiveShare'
                    });
                }
                
                function handleChatInput(event) {
                    if (event.key === 'Enter') {
                        const input = event.target;
                        const message = input.value.trim();
                        if (message) {
                            vscode.postMessage({
                                command: 'sendTeamMessage',
                                text: message
                            });
                            input.value = '';
                        }
                    }
                }
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'addMessage':
                            addChatMessage(message.sender, message.message, message.timestamp);
                            break;
                        case 'updateActivity':
                            updateTeamActivity(message.activity);
                            break;
                        case 'updateSessionStatus':
                            updateSessionStatus(message.status, message.link);
                            break;
                    }
                });
                
                function addChatMessage(sender, text, timestamp) {
                    const chatMessages = document.getElementById('chatMessages');
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'chat-message';
                    messageDiv.innerHTML = \`<strong>\${sender}:</strong> \${text} <small>(\${timestamp})</small>\`;
                    chatMessages.appendChild(messageDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                
                function updateTeamActivity(activity) {
                    // TODO: Update team activity display
                    console.log('Activity update:', activity);
                }

                function updateSessionStatus(status, link) {
                    const statusDiv = document.getElementById('sessionStatus');
                    if (status == 'hosting') {
                        statusDiv.innerHTML = '<span class="status-indicator"></span>Hosting session: ' + link;
                    } else if (status == 'joined') {
                        statusDiv.innerHTML = '<span class="status-indicator"></span>Joined session';
                    } else {
                        statusDiv.innerHTML = 'No active session'; 
                    }
                }  
            </script>
        </body>
        </html>`;
    }
}