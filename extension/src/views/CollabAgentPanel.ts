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
                    case 'leaveLiveShare':
                        console.log('Handling leaveLiveShare command');
                        this.leaveLiveShareSession();
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
        if (!this._liveShareApi) {
            return;
        }
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
        console.log('Session change event details:', {
            changeType: sessionChangeEvent.changeType,
            session: session ? {
                id: session.id,
                role: session.role,
                peerNumber: session.peerNumber,
                user: session.user
            } : null
        });
        
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

            // Determine the correct status based on role
            const isHost = session.role === vsls.Role.Host;
            let status = 'joined'; // default
            
            if (isHost) {
                status = 'hosting';
            } else if (session.role === vsls.Role.Guest) {
                status = 'joined';
            }
            
            const sessionLink = session.uri?.toString() || '';
            
            // Try to get participant count immediately
            let participantCount = session.peerNumber || 1;
            if (isHost && participantCount === 1) {
                // For hosts, sometimes we need to wait a moment for participant count to update
                setTimeout(() => {
                    this.updateParticipantInfo();
                }, 1000);
            }
            
            console.log('Sending updateSessionStatus message:', {
                status: status,
                link: sessionLink,
                participants: participantCount,
                role: session.role,
                duration: this.getSessionDuration(),
                isHost: isHost
            });
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: status,
                    link: sessionLink,
                    participants: participantCount,
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
                
                // After showing "ended" briefly, switch to "none" to show "No active session"
                setTimeout(() => {
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'updateSessionStatus',
                            status: 'none',
                            link: '',
                            participants: 0
                        });
                    }
                }, 2000); // Show "ended" for 2 seconds, then "No active session"
            }
            this.stopParticipantMonitoring();
        }
    }

    private monitorSessionState() {
        // Check current session state immediately
        console.log('monitorSessionState: Checking session state...');
        console.log('monitorSessionState: _liveShareApi exists:', !!this._liveShareApi);
        console.log('monitorSessionState: _liveShareApi.session exists:', !!this._liveShareApi?.session);
        
        if (this._liveShareApi?.session) {
            // Only process if it's an active, valid session
            const session = this._liveShareApi.session;
            console.log('monitorSessionState: Session details:', {
                id: session.id,
                role: session.role,
                isValid: !!(session.id && (session.role === vsls.Role.Host || session.role === vsls.Role.Guest))
            });
            
            // Validate that this is actually an active session
            if (session.id && (session.role === vsls.Role.Host || session.role === vsls.Role.Guest)) {
                console.log('Found existing active session:', session);
                this.handleSessionChange({ session: session, changeType: 'existing' });
            } else {
                console.log('Found invalid or inactive session, clearing UI state');
                // Clear any invalid session state
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: 'none',
                        link: '',
                        participants: 0
                    });
                }
            }
        } else {
            console.log('No existing session found, clearing UI state');
            // Ensure UI shows no session
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'none',
                    link: '',
                    participants: 0
                });
            }
        }
        
        // Set up periodic monitoring to catch session state changes
        // that might not trigger the event listener
        setInterval(() => {
            this.periodicSessionCheck();
        }, 5000); // Check every 5 seconds
    }
    
    private periodicSessionCheck() {
        if (!this._liveShareApi) {
            return;
        }
        
        const hasSession = !!this._liveShareApi.session;
        const hasValidSession = hasSession && 
            this._liveShareApi.session.id && 
            (this._liveShareApi.session.role === vsls.Role.Host || this._liveShareApi.session.role === vsls.Role.Guest);
        
        console.log('periodicSessionCheck:', { hasSession, hasValidSession, sessionId: this._liveShareApi.session?.id });
        
        // If we don't have a valid session but the UI might be showing one, clear it
        if (!hasValidSession && this._view) {
            console.log('periodicSessionCheck: No valid session, ensuring UI shows none');
            this._view.webview.postMessage({
                command: 'updateSessionStatus',
                status: 'none',
                link: '',
                participants: 0
            });
            
            // Also clear any session-related state
            this.sessionStartTime = undefined;
            this.stopParticipantMonitoring();
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
            
            // Get participant count - try multiple approaches
            let participantCount = 1; // Start with at least 1 (self)
            let detectionMethod = 'fallback';
            
            // Method 1: Check peerNumber
            if (session.peerNumber !== undefined && session.peerNumber > 0) {
                participantCount = session.peerNumber;
                detectionMethod = 'peerNumber';
            }
            
            // Method 2: For hosts, try to get real participant information
            if (session.role === vsls.Role.Host) {
                try {
                    // Use VS Code Live Share command to get participants
                    const liveShareExtension = vscode.extensions.getExtension('ms-vsliveshare.vsliveshare');
                    if (liveShareExtension && liveShareExtension.isActive) {
                        // Try to get participant count from Live Share extension
                        const participants = await vscode.commands.executeCommand('liveshare.participants.list');
                        if (participants && Array.isArray(participants) && participants.length > 0) {
                            participantCount = participants.length + 1; // +1 for host
                            detectionMethod = 'liveshare-command';
                            console.log('Host: Found participants via command:', participants.length);
                        }
                    }
                } catch (error) {
                    console.log('Could not get participants via command:', error);
                }
                
                // Fallback: Check if session indicates multiple users
                if (participantCount === 1 && this.sessionStartTime) {
                    const sessionAge = Date.now() - this.sessionStartTime.getTime();
                    // If session is older than 5 seconds, periodically check for updates
                    if (sessionAge > 5000) {
                        console.log('Host: Checking for delayed participant detection...');
                        // Force a session refresh
                        setTimeout(() => {
                            this.updateParticipantInfo();
                        }, 2000);
                    }
                }
            }
            
            const currentDuration = this.getSessionDuration();
            
            console.log('updateParticipantInfo:', { 
                participantCount, 
                detectionMethod,
                duration: currentDuration,
                sessionStartTime: this.sessionStartTime,
                role: session.role === vsls.Role.Host ? 'Host' : 'Guest',
                sessionId: session.id,
                rawPeerNumber: session.peerNumber
            });
            
            // Build participant list with available information
            const participants = [];
            
            // Add self
            participants.push({
                name: session.user?.displayName || 'You',
                email: session.user?.emailAddress || '',
                role: session.role === vsls.Role.Host ? 'Host' : 'Guest'
            });
            
            // Add other participants if detected
            if (participantCount > 1) {
                for (let i = 1; i < participantCount; i++) {
                    participants.push({
                        name: `Teammate ${i}`,
                        email: '',
                        role: session.role === vsls.Role.Host ? 'Guest' : 'Host'
                    });
                }
            }

            console.log('Sending participant update:', { participants, count: participantCount, method: detectionMethod });

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
            
            // Immediately clear the UI state
            this.sessionStartTime = undefined;
            this.stopParticipantMonitoring();
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'none',
                    link: '',
                    participants: 0
                });
                
                // Reset button state
                this._view.webview.postMessage({
                    command: 'resetButtonState',
                    buttonType: 'end'
                });
            }
            
            vscode.window.showInformationMessage('Live Share session ended successfully.');
        } catch (error) {
            console.error('Error ending Live Share session:', error);
            vscode.window.showErrorMessage('Failed to end Live Share session: ' + error);
            
            // Reset button state on error
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'resetButtonState',
                    buttonType: 'end'
                });
            }
        }
    }

    private async leaveLiveShareSession() {
        try {
            console.log('Attempting to leave Live Share session...');
            
            if (!this._liveShareApi) {
                console.log('Live Share API not available');
                vscode.window.showWarningMessage('Live Share API not available.');
                return;
            }

            if (!this._liveShareApi.session) {
                console.log('No active session found');
                vscode.window.showWarningMessage('No active Live Share session to leave.');
                return;
            }

            const session = this._liveShareApi.session;
            console.log('Current session role:', session.role);
            
            if (session.role === vsls.Role.Host) {
                vscode.window.showWarningMessage('Hosts cannot leave their own session. Use "End Session" instead.');
                return;
            }

            console.log('Calling end() on Live Share API to leave session...');
            // For guests, end() will leave the session
            await this._liveShareApi.end();
            console.log('Live Share leave completed');
            
            // Clear the UI state
            this.sessionStartTime = undefined;
            this.stopParticipantMonitoring();
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'none',
                    link: '',
                    participants: 0
                });
                
                // Reset button state
                this._view.webview.postMessage({
                    command: 'resetButtonState',
                    buttonType: 'leave'
                });
            }
            
            vscode.window.showInformationMessage('Successfully left the Live Share session.');
        } catch (error) {
            console.error('Error leaving Live Share session:', error);
            vscode.window.showErrorMessage('Failed to leave Live Share session: ' + error);
            
            // Reset button state on error
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'resetButtonState',
                    buttonType: 'leave'
                });
            }
        }
    }

    private getSessionDuration(): string {
        if (!this.sessionStartTime) {
            return '0m';
        }
        
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
                    if (!value || value.trim().length === 0) {
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
                
                .chat-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 12px;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    font-size: max(12px, min(14px, 2.5vw));
                    font-family: var(--vscode-font-family);
                    margin-top: 8px;
                    outline: none;
                    resize: none;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .chat-input:focus {
                    border-color: var(--vscode-focusBorder);
                    background-color: var(--vscode-input-background);
                }
                
                .chat-input::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                    font-size: max(11px, min(13px, 2.3vw));
                }
                
                /* Responsive adjustments for different panel sizes */
                @media (max-width: 250px) {
                    .chat-input {
                        font-size: 11px;
                        padding: 6px 8px;
                    }
                    .chat-input::placeholder {
                        font-size: 10px;
                    }
                }
                
                @media (min-width: 350px) {
                    .chat-input {
                        font-size: 13px;
                    }
                    .chat-input::placeholder {
                        font-size: 12px;
                    }
                }
                
                .chat-messages {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-bottom: 8px;
                    padding: 4px 0;
                }
                
                .chat-message {
                    margin-bottom: 8px;
                    font-size: 12px;
                    line-height: 1.4;
                }
                
                .end-session-btn {
                    background-color: var(--vscode-errorForeground) !important;
                    color: white !important;
                    margin-top: 8px;
                    font-size: 12px;
                    padding: 6px 12px;
                    border: none !important;
                    border-radius: 4px;
                    cursor: pointer;
                    width: auto !important;
                    height: auto !important;
                    display: inline-block !important;
                }

                .end-session-btn:hover {
                    background-color: var(--vscode-errorForeground) !important;
                    opacity: 0.8;
                }

                .leave-session-btn {
                    background-color: var(--vscode-charts-orange) !important;
                    color: white !important;
                    margin-top: 8px;
                    font-size: 12px;
                    padding: 6px 12px;
                    border: none !important;
                    border-radius: 4px;
                    cursor: pointer;
                    width: auto !important;
                    height: auto !important;
                    display: inline-block !important;
                }

                .leave-session-btn:hover {
                    background-color: var(--vscode-charts-orange) !important;
                    opacity: 0.8;
                }

                .end-session-btn:disabled,
                .leave-session-btn:disabled {
                    opacity: 0.6 !important;
                    cursor: not-allowed !important;
                    pointer-events: none !important;
                }

                .agent-heading {
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 20px;
                    padding: 10px 0;
                    letter-spacing: 2px;
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
                
                .chat-messages {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-bottom: 8px;
                    padding: 4px 0;
                }
                
                .chat-message {
                    margin-bottom: 8px;
                    font-size: 12px;
                    line-height: 1.4;
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
                
                .loading {
                    background-color: var(--vscode-charts-orange);
                    animation: pulse 1.5s ease-in-out infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                .agent-heading {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    padding: 16px 0;
                    color: var(--vscode-textLink-foreground);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
            </style>
        </head>
        <body>
            <div class="agent-heading">AGENT</div>
            
            <div class="section">
                <div class="section-title">🚀 Live Share Session</div>
                <div id="sessionButtons">
                    <button class="button" id="startSessionBtn" onclick="startLiveShare()">Start Session</button>
                    <button class="button" id="joinSessionBtn" onclick="joinLiveShare()">Join Session</button>
                </div>
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
                let isEndingSession = false; // Flag to track if session is being ended
                let endingSessionTimer = null; // Timer to extend protection window
                
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
                        case 'resetButtonState':
                            resetButtonState(message.buttonType);
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
                    const sessionButtons = document.getElementById('sessionButtons');
                    const participantCount = participants || 1;
                    const sessionDuration = duration || '0m';
                    
                    console.log('Status update received:', status, 'isEndingSession:', isEndingSession);
                    
                    // If we're ending the session, ignore 'joined' status updates to prevent flickering
                    if (isEndingSession && status === 'joined') {
                        console.log('Ignoring joined status during session ending process');
                        return;
                    }
                    
                    if (status === 'hosting') {
                        // Hide Start/Join buttons when hosting
                        if (sessionButtons) sessionButtons.style.display = 'none';
                        
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
                        // Hide Start/Join buttons when joined as guest
                        if (sessionButtons) sessionButtons.style.display = 'none';
                        
                        statusDiv.innerHTML = \`
                            <div class="status-active">
                                <span class="status-indicator active"></span>
                                <strong>Joined Live Share Session</strong>
                                <div class="session-info">
                                    <div>Participants: \${participantCount}</div>
                                    <div>Duration: \${sessionDuration}</div>
                                    <div>Role: Guest</div>
                                    <button class="button leave-session-btn" onclick="leaveSession()">Leave Session</button>
                                </div>
                            </div>
                        \`;
                    } else if (status === 'ended') {
                        // Don't reset the ending flag immediately - use timer to prevent delayed 'joined' updates
                        console.log('Session ended - starting extended protection timer');
                        
                        // Clear any existing timer
                        if (endingSessionTimer) {
                            clearTimeout(endingSessionTimer);
                        }
                        
                        // Show loading state during cleanup
                        statusDiv.innerHTML = \`
                            <div class="status-inactive">
                                <span class="status-indicator loading"></span>
                                <strong>Cleaning up session...</strong>
                                <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
                                    Session controls will be available shortly
                                </div>
                            </div>
                        \`;
                        
                        // Set extended timer to reset the flag after delayed updates settle
                        endingSessionTimer = setTimeout(() => {
                            console.log('Extended protection period ended - resetting isEndingSession flag');
                            isEndingSession = false;
                            endingSessionTimer = null;
                            
                            // Show Start/Join buttons when cleanup is complete
                            if (sessionButtons) sessionButtons.style.display = 'block';
                            
                            // Update to final state
                            statusDiv.innerHTML = \`
                                <div class="status-inactive">
                                    <span class="status-indicator"></span>
                                    No active session
                                </div>
                            \`;
                        }, 8000); // 8 second protection window
                    } else {
                        // Default: no active session (status === 'none' or anything else)
                        // Only reset the ending flag if we're not in an active ending process
                        if (!isEndingSession) {
                            console.log('No active session - normal state');
                            
                            // Clear any existing timer if we're definitely back to no session
                            if (endingSessionTimer) {
                                clearTimeout(endingSessionTimer);
                                endingSessionTimer = null;
                            }
                            
                            // Show Start/Join buttons when no active session
                            if (sessionButtons) sessionButtons.style.display = 'block';
                            
                            statusDiv.innerHTML = \`
                                <div class="status-inactive">
                                    <span class="status-indicator"></span>
                                    No active session
                                </div>
                            \`;
                        } else {
                            console.log('No active session during ending process - showing cleanup state');
                            
                            // Show cleanup message if we're in ending process
                            statusDiv.innerHTML = \`
                                <div class="status-inactive">
                                    <span class="status-indicator loading"></span>
                                    <strong>Cleaning up session...</strong>
                                    <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px;">
                                        Session controls will be available shortly
                                    </div>
                                </div>
                            \`;
                        }
                    }
                }

                function endSession() {
                    console.log('End Session button clicked');
                    
                    // Set flag to prevent flickering during session end
                    isEndingSession = true;
                    
                    // Update button to show loading state
                    const button = document.querySelector('.end-session-btn');
                    if (button) {
                        button.textContent = 'Ending...';
                        button.disabled = true;
                        button.style.opacity = '0.6';
                        button.style.cursor = 'not-allowed';
                    }
                    
                    // Set timeout to reset button and flag if operation takes too long
                    setTimeout(() => {
                        resetButtonState('end');
                        // Clear any existing timer and reset flag as final safeguard
                        if (endingSessionTimer) {
                            clearTimeout(endingSessionTimer);
                            endingSessionTimer = null;
                        }
                        isEndingSession = false;
                        console.log('Timeout safeguard triggered - resetting all ending session state');
                    }, 15000); // 15 second timeout (longer than protection window)
                    
                    vscode.postMessage({
                        command: 'endLiveShare'
                    });
                    console.log('Sent endLiveShare message to extension');
                }

                function leaveSession() {
                    console.log('Leave Session button clicked');
                    
                    // Update button to show loading state
                    const button = document.querySelector('.leave-session-btn');
                    if (button) {
                        button.textContent = 'Leaving...';
                        button.disabled = true;
                        button.style.opacity = '0.6';
                        button.style.cursor = 'not-allowed';
                    }
                    
                    // Set timeout to reset button if operation takes too long
                    setTimeout(() => {
                        resetButtonState('leave');
                    }, 10000); // 10 second timeout
                    
                    vscode.postMessage({
                        command: 'leaveLiveShare'
                    });
                    console.log('Sent leaveLiveShare message to extension');
                }

                function resetButtonState(buttonType) {
                    if (buttonType === 'end') {
                        const button = document.querySelector('.end-session-btn');
                        if (button) {
                            button.textContent = 'End Session';
                            button.disabled = false;
                            button.style.opacity = '1';
                            button.style.cursor = 'pointer';
                        }
                    } else if (buttonType === 'leave') {
                        const button = document.querySelector('.leave-session-btn');
                        if (button) {
                            button.textContent = 'Leave Session';
                            button.disabled = false;
                            button.style.opacity = '1';
                            button.style.cursor = 'pointer';
                        }
                    }
                }

                function updateParticipants(participants, count) {
                    console.log('updateParticipants called with:', participants, count);
                    
                    // Update the existing Team Activity section
                    const teamActivityDiv = document.getElementById('teamActivity');
                    if (teamActivityDiv && participants && participants.length > 0) {
                        console.log('Updating team activity with participants:', participants);
                        
                        teamActivityDiv.innerHTML = \`
                            <div class="participant-list">
                                <h4>Active Participants (\${count})</h4>
                                \${participants.map((p, index) => \`
                                    <div class="participant-item">
                                        <span class="status-indicator active"></span>
                                        <span class="participant-name">\${p.name}</span>
                                        <span class="participant-role">\${p.role}</span>
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                        
                        console.log('Team activity updated successfully');
                    } else {
                        console.log('No team activity div found or no participants:', { teamActivityDiv, participants });
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