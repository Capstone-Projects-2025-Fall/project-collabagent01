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
                console.log('Received message from webview:', message);
                switch (message.command) {
                    case 'startLiveShare':
                        console.log('Handling startLiveShare command');
                        this.startLiveShareSession();
                        return;
                    case 'joinLiveShare':
                        console.log('Handling joinLiveShare command');
                        this.joinLiveShareSession();
                        return;
                    case 'endLiveShare':
                        console.log('Handling endLiveShare command');
                        this.endLiveShareSession();
                        return;
                    case 'sendTeamMessage':
                        console.log('Handling sendTeamMessage command');
                        this.sendTeamMessage(message.text);
                        return;
                    default:
                        console.log('Unknown command received:', message.command);
                }
            },
            undefined,
            []
        );
    }

    private async initializeLiveShare(): Promise<boolean> {
        try {
            // Wait a bit for Live Share extension to be fully loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this._liveShareApi = await vsls.getApi();
            if (this._liveShareApi) {
                console.log('Live Share API initialized successfully.');
                
                // Set up session event listeners for real-time monitoring
                this.setupLiveShareEventListeners();
                
                return true;
            } else {
                console.log('Live Share extension not available.');
                // Retry after a delay
                setTimeout(() => {
                    console.log('Retrying Live Share initialization...');
                    this.initializeLiveShare();
                }, 3000);
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize Live Share API:', error);
            // Retry after a delay
            setTimeout(() => {
                console.log('Retrying Live Share initialization after error...');
                this.initializeLiveShare();
            }, 5000);
            return false;
        }
    }

    private setupLiveShareEventListeners() {
        if (!this._liveShareApi) return;

        try {
            // Listen for session state changes
            this._liveShareApi.onDidChangeSession((sessionChangeEvent) => {
                console.log('Live Share session changed:', sessionChangeEvent);
                this.handleSessionChange(sessionChangeEvent);
            });

            // Monitor the current session state
            this.monitorSessionState();
        } catch (error) {
            console.error('Error setting up Live Share event listeners:', error);
        }
    }

    private handleSessionChange(sessionChangeEvent: any) {
        const session = sessionChangeEvent.session;
        console.log('handleSessionChange called with session:', session);
        
        if (session) {
            console.log('Session active:', {
                id: session.id,
                role: session.role,
                uri: session.uri?.toString(),
                peerNumber: session.peerNumber,
                user: session.user
            });

            // Track session start time - reset if we're seeing a new session
            if (!this.sessionStartTime || sessionChangeEvent.changeType === 'joined') {
                this.sessionStartTime = new Date();
                console.log('Session start time set to:', this.sessionStartTime);
            }

            // Update UI based on session role
            const isHost = session.role === vsls.Role.Host;
            const sessionLink = session.uri?.toString() || '';
            
            console.log('Sending updateSessionStatus message:', {
                status: isHost ? 'hosting' : 'joined',
                link: sessionLink,
                participants: session.peerNumber || 1,
                role: session.role,
                duration: this.getSessionDuration()
            });
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: isHost ? 'hosting' : 'joined',
                    link: sessionLink,
                    participants: session.peerNumber || 1,
                    role: session.role,
                    duration: this.getSessionDuration()
                });
            }

            // Start monitoring participants if we're in a session
            this.startParticipantMonitoring();
        } else {
            console.log('Session ended - clearing session start time');
            this.sessionStartTime = undefined;
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'ended',
                    link: '',
                    participants: 0
                });
            }
            this.stopParticipantMonitoring();
        }
    }

    private monitorSessionState() {
        // Check current session state immediately
        if (this._liveShareApi?.session) {
            this.handleSessionChange({ session: this._liveShareApi.session });
        }
    }

    private participantMonitoringInterval?: NodeJS.Timeout;
    private sessionStartTime?: Date;

    private startParticipantMonitoring() {
        // Clear any existing monitoring
        this.stopParticipantMonitoring();
        
        // Monitor participants every 2 seconds for more responsive updates
        this.participantMonitoringInterval = setInterval(() => {
            this.updateParticipantInfo();
        }, 2000);

        // Update immediately
        this.updateParticipantInfo();
    }

    private stopParticipantMonitoring() {
        if (this.participantMonitoringInterval) {
            clearInterval(this.participantMonitoringInterval);
            this.participantMonitoringInterval = undefined;
        }
    }

    private async updateParticipantInfo() {
        if (!this._liveShareApi?.session) {
            console.log('updateParticipantInfo: No session available');
            return;
        }

        try {
            const session = this._liveShareApi.session;
            const participantCount = session.peerNumber || 1;
            const currentDuration = this.getSessionDuration();
            
            console.log('updateParticipantInfo:', { 
                participantCount, 
                duration: currentDuration,
                sessionStartTime: this.sessionStartTime 
            });
            
            // Get more detailed participant info if available
            const participants = [{
                name: session.user?.displayName || 'You',
                email: session.user?.emailAddress || '',
                role: session.role === vsls.Role.Host ? 'Host' : 'Guest'
            }];

            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants: participants,
                    count: participantCount
                });
                
                // Also update session status with current duration
                const isHost = session.role === vsls.Role.Host;
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: isHost ? 'hosting' : 'joined',
                    link: '', // Session link not available in participant monitoring
                    participants: participantCount,
                    role: session.role,
                    duration: currentDuration
                });
            }
        } catch (error) {
            console.error('Error updating participant info:', error);
        }
    }

    private async endLiveShareSession() {
        try {
            console.log('Attempting to end Live Share session...');
            
            if (!this._liveShareApi) {
                console.log('Live Share API not available');
                vscode.window.showWarningMessage('Live Share API not available.');
                return;
            }

            if (!this._liveShareApi.session) {
                console.log('No active session found');
                vscode.window.showWarningMessage('No active Live Share session to end.');
                return;
            }

            console.log('Current session role:', this._liveShareApi.session.role);
            console.log('Host role constant:', vsls.Role.Host);
            
            if (this._liveShareApi.session.role !== vsls.Role.Host) {
                vscode.window.showWarningMessage('Only the session host can end the session.');
                return;
            }

            console.log('Calling end() on Live Share API...');
            // End the session
            await this._liveShareApi.end();
            console.log('Live Share end() completed');
            vscode.window.showInformationMessage('Live Share session ended successfully.');
        } catch (error) {
            console.error('Error ending Live Share session:', error);
            vscode.window.showErrorMessage('Failed to end Live Share session: ' + error);
        }
    }

    private getSessionDuration(): string {
        if (!this.sessionStartTime) return '0m';
        
        const now = new Date();
        const diffMs = now.getTime() - this.sessionStartTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        
        if (diffHours > 0) {
            return `${diffHours}h ${diffMins % 60}m`;
        }
        return `${diffMins}m`;
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
                
                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--vscode-descriptionForeground);
                    margin-right: 8px;
                }
                
                .status-indicator.active {
                    background-color: #4CAF50;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .status-active {
                    color: var(--vscode-textLink-foreground);
                }
                
                .status-inactive {
                    color: var(--vscode-descriptionForeground);
                }
                
                .session-info {
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                
                .session-link {
                    margin-top: 4px;
                    word-break: break-all;
                }
                
                .session-link code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                    font-size: 11px;
                }
                
                .participant-list {
                    margin-top: 12px;
                    padding: 8px;
                    background-color: var(--vscode-textCodeBlock-background);
                    border-radius: 4px;
                }
                
                .participant-list h4 {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    color: var(--vscode-textLink-foreground);
                }
                
                .participant-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                
                .participant-item:last-child {
                    border-bottom: none;
                }
                
                .participant-name {
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .participant-role {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 10px;
                }
                
                .end-session-btn {
                    background-color: var(--vscode-errorForeground);
                    color: white;
                    margin-top: 8px;
                    font-size: 12px;
                    padding: 6px 12px;
                }
                
                .end-session-btn:hover {
                    background-color: var(--vscode-errorForeground);
                    opacity: 0.8;
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
                            updateSessionStatus(message.status, message.link, message.participants, message.role);
                            break;
                        case 'updateParticipants':
                            updateParticipants(message.participants, message.count);
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

                function updateSessionStatus(status, link, participants, role, duration) {
                    const statusDiv = document.getElementById('sessionStatus');
                    const participantCount = participants || 1;
                    const sessionDuration = duration || '0m';
                    
                    if (status === 'hosting') {
                        statusDiv.innerHTML = \`
                            <div class="status-active">
                                <span class="status-indicator active"></span>
                                <strong>Hosting Live Share Session</strong>
                                <div class="session-info">
                                    <div>Participants: \${participantCount}</div>
                                    <div>Duration: \${sessionDuration}</div>
                                    <div class="session-link">Link: <code>\${link}</code></div>
                                    <button class="button end-session-btn" onclick="endSession()">End Session</button>
                                </div>
                            </div>
                        \`;
                    } else if (status === 'joined') {
                        statusDiv.innerHTML = \`
                            <div class="status-active">
                                <span class="status-indicator active"></span>
                                <strong>Joined Live Share Session</strong>
                                <div class="session-info">
                                    <div>Participants: \${participantCount}</div>
                                    <div>Duration: \${sessionDuration}</div>
                                    <div>Role: Guest</div>
                                </div>
                            </div>
                        \`;
                    } else if (status === 'ended') {
                        statusDiv.innerHTML = \`
                            <div class="status-inactive">
                                <span class="status-indicator"></span>
                                <strong>Session Ended</strong>
                            </div>
                        \`;
                    } else {
                        statusDiv.innerHTML = \`
                            <div class="status-inactive">
                                <span class="status-indicator"></span>
                                No active session
                            </div>
                        \`;
                    }
                }

                function endSession() {
                    console.log('End Session button clicked');
                    vscode.postMessage({
                        command: 'endLiveShare'
                    });
                    console.log('Sent endLiveShare message to extension');
                }

                function updateParticipants(participants, count) {
                    console.log('Updating participants:', participants, count);
                    
                    // Update participant list in Team Activity section
                    const teamSection = document.querySelector('.team-activity');
                    if (teamSection && participants) {
                        let participantList = teamSection.querySelector('.participant-list');
                        if (!participantList) {
                            participantList = document.createElement('div');
                            participantList.className = 'participant-list';
                            teamSection.appendChild(participantList);
                        }
                        
                        participantList.innerHTML = \`
                            <h4>Active Participants (\${count})</h4>
                            \${participants.map(p => \`
                                <div class="participant-item">
                                    <span class="participant-name">\${p.name}</span>
                                    <span class="participant-role">\${p.role}</span>
                                </div>
                            \`).join('')}
                        \`;
                    }
                }  
            </script>
        </body>
        </html>`;
    }

    dispose() {
        // Stop participant monitoring
        this.stopParticipantMonitoring();
        
        // Dispose of any other resources
        this._view = undefined;
        this._liveShareApi = undefined;
    }
}