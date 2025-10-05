import * as vscode from 'vscode';
import * as vsls from 'vsls';
import { getCachedDisplayName, getOrInitDisplayName } from '../services/profile-service';

export class CollabAgentPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'collabAgent.teamActivity';

    private _view?: vscode.WebviewView;
    private _liveShareApi?: vsls.LiveShare | null = null; 
    // Shared service name for propagating host session metadata (e.g., start time)
    private readonly _sharedServiceName = 'collabAgentSessionInfo';
    private _sharedService: any | undefined; // Use loose typing to avoid dependency on specific vsls type defs
    private _sessionLink: string | undefined; // Persist session link for consistent display
    private _initialSessionCheckDone = false; // Helps avoid flicker by showing loading state first

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {
    // You can store _context for later use
}

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
                    case 'manualSetInviteLink':
                        console.log('Handling manualSetInviteLink command');
                        this.setManualInviteLink(message.link);
                        return;
                    case 'manualClearInviteLink':
                        console.log('Handling manualClearInviteLink command');
                        this.clearManualInviteLink();
                        return;
                    case 'requestStoredLink':
                        console.log('Handling requestStoredLink command');
                        this.sendStoredLinkToWebview();
                        return;
                    case 'manualPasteInviteLink':
                        console.log('Handling manualPasteInviteLink command');
                        this.pasteInviteLinkFromClipboard();
                        return;
                    default:
                        console.log('Unknown command received:', message.command);
                }
            },
            undefined,
            []
        );
    }

    // --- Manual invite link support (fallback when Live Share API does not expose link) ---
    private readonly _persistedLinkKey = 'collabAgent.manualInviteLink';

    private setManualInviteLink(link: string | undefined) {
        if (!link || !link.trim()) {
            if (this._view) {
                this._view.webview.postMessage({ command: 'manualLinkInvalid', reason: 'empty' });
            }
            return;
        }
        const trimmed = link.trim();
        this._sessionLink = trimmed;
        // Persist so reload maintains it until session ends or cleared
        this._context.globalState.update(this._persistedLinkKey, this._sessionLink);
        if (this._view) {
            this._view.webview.postMessage({
                command: 'manualLinkUpdated',
                link: this._sessionLink
            });
            // Also push a status refresh if currently hosting
            const status = this._liveShareApi?.session?.role === vsls.Role.Host ? 'hosting' : (this._liveShareApi?.session ? 'joined' : 'none');
            this._view.webview.postMessage({
                command: 'updateSessionStatus',
                status,
                link: this._sessionLink,
                participants: (this._liveShareApi?.peers?.length || 0) + (this._liveShareApi?.session ? 1 : 0),
                role: this._liveShareApi?.session?.role,
                duration: this.getSessionDuration()
            });
        }
    }

    private clearManualInviteLink() {
        this._sessionLink = undefined;
        this._context.globalState.update(this._persistedLinkKey, undefined);
        if (this._view) {
            this._view.webview.postMessage({ command: 'manualLinkCleared' });
            const status = this._liveShareApi?.session?.role === vsls.Role.Host ? 'hosting' : (this._liveShareApi?.session ? 'joined' : 'none');
            this._view.webview.postMessage({
                command: 'updateSessionStatus',
                status,
                link: '',
                participants: (this._liveShareApi?.peers?.length || 0) + (this._liveShareApi?.session ? 1 : 0),
                role: this._liveShareApi?.session?.role,
                duration: this.getSessionDuration()
            });
        }
    }

    private sendStoredLinkToWebview() {
        const stored = this._context.globalState.get<string | undefined>(this._persistedLinkKey);
        if (stored) {
            this._sessionLink = stored; // restore into memory
            if (this._view) {
                this._view.webview.postMessage({ command: 'storedLink', link: stored });
                // Also push a status update if in session
                if (this._liveShareApi?.session) {
                    const s = this._liveShareApi.session;
                    this._view.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: s.role === vsls.Role.Host ? 'hosting' : 'joined',
                        link: stored,
                        participants: (this._liveShareApi.peers?.length || 0) + 1,
                        role: s.role,
                        duration: this.getSessionDuration()
                    });
                }
            }
        }
    }

    private async pasteInviteLinkFromClipboard() {
        try {
            const clip = await vscode.env.clipboard.readText();
            if (clip && clip.trim()) {
                const trimmed = clip.trim();
                this.setManualInviteLink(trimmed);
                if (this._view) {
                    this._view.webview.postMessage({ command: 'manualLinkPasted', link: trimmed });
                }
            } else {
                if (this._view) {
                    this._view.webview.postMessage({ command: 'manualLinkPasteInvalid' });
                }
                vscode.window.showWarningMessage('Clipboard is empty or does not contain text.');
            }
        } catch (err) {
            console.warn('Failed reading clipboard for invite link:', err);
            vscode.window.showErrorMessage('Could not read clipboard for invite link.');
        }
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

                //Step 2: Let Guests Subscribe to These Updates (if already a guest)
                if (this._liveShareApi?.session?.role === vsls.Role.Guest) {
                    console.log('[initializeLiveShare] Guest detected, setting up participantUpdate listener.');
                    this.setupGuestParticipantListener();
                }
                
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

            // Listen for peer (participant) changes so guests also see updated counts
            if (typeof (this._liveShareApi as any).onDidChangePeers === 'function') {
                (this._liveShareApi as any).onDidChangePeers((peerChangeEvent: any) => {
                    console.log('Live Share peers changed:', peerChangeEvent);
                    // Immediately refresh participant info
                    this.updateParticipantInfo();
                    // As guest, also run fallback update to keep UI correct until host notifies
                    if (this._liveShareApi?.session?.role === vsls.Role.Guest) {
                        this.updateGuestParticipantFallback();
                    }
                });
            } else {
                console.warn('Live Share API does not expose onDidChangePeers in this environment. Falling back to polling only.');
            }

            // Additional safety net: some environments update activity sooner than peers array
            if (typeof (this._liveShareApi as any).onActivity === 'function') {
                (this._liveShareApi as any).onActivity((activity: any) => {
                    if (activity && /session/i.test(JSON.stringify(activity))) {
                        console.log('Activity hinting at potential participant change:', activity);
                        this.updateParticipantInfo();
                    }
                });
            }

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

            // Track session start time - include host 'started' events and guest 'joined'
            if (!this.sessionStartTime || ['joined','started','start','starting'].includes(String(sessionChangeEvent.changeType).toLowerCase())) {
                this.sessionStartTime = new Date();
                console.log('Session start time set to (local clock):', this.sessionStartTime, 'changeType:', sessionChangeEvent.changeType);
            }
            // If we're host, ensure shared service is registered so guests can fetch accurate start time
            if (session.role === vsls.Role.Host) {
                this.registerSessionInfoServiceIfHost();
            } else if (session.role === vsls.Role.Guest && !this._requestedHostStartTime) {
                // As guest, attempt to request host's actual start time (only once)
                this.requestHostSessionStartTime();
            }

            // Determine the correct status based on role
            const isHost = session.role === vsls.Role.Host;
            let status = 'joined'; // default
            
            if (isHost) {
                status = 'hosting';
            } else if (session.role === vsls.Role.Guest) {
                status = 'joined';
                // Ensure guest listener is attached when we become a guest after joining
                this.setupGuestParticipantListener();
                // Kick a quick local fallback update so UI doesn't show 1
                this.updateGuestParticipantFallback();
            }
            
            const sessionLink = session.uri?.toString() || this._sessionLink || '';
            if (sessionLink) {
                this._sessionLink = sessionLink;
            }
            // Prefer peers array for current participants to avoid cumulative peerNumber inflation
            let participantCount = (this._liveShareApi?.peers?.length || 0) + 1; // +1 self
            // For guests, never show less than 2 because a host must exist
            if (!isHost) {
                const sessionPeerNum = typeof (session as any).peerNumber === 'number' ? (session as any).peerNumber : undefined;
                const candidate = sessionPeerNum && sessionPeerNum >= 2 ? sessionPeerNum : participantCount;
                participantCount = Math.max(2, candidate);
            }
            if (isHost && participantCount === 1) {
                setTimeout(() => this.updateParticipantInfo(), 1000);
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
            this.stopDurationUpdater();
            // Clear any persisted manual link upon full session end
            this.clearManualInviteLink();
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'ended',
                    link: '',
                    participants: 0
                });

                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants: [],
                    count: 0
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

    // Ensure guests subscribe to host participant updates, even if they joined after initialization
    private async setupGuestParticipantListener() {
        try {
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== vsls.Role.Guest) {
                return;
            }
            const anyApi: any = this._liveShareApi;
            const proxy = await anyApi.getSharedService(this._sharedServiceName);
            if (!proxy) {
                console.warn('[setupGuestParticipantListener] Could not obtain shared service proxy.');
                return;
            }

            const attach = () => {
                if (typeof proxy.onNotify === 'function') {
                    console.log('[setupGuestParticipantListener] Attaching onNotify(participantUpdate).');
                    proxy.onNotify('participantUpdate', (data: any) => {
                        console.log('[onNotify:participantUpdate] Guest received participant update:', data);
                        if (this._view) {
                            this._view.webview.postMessage({
                                command: 'updateParticipants',
                                participants: data.participants,
                                count: data.count
                            });
                            this._view.webview.postMessage({
                                command: 'updateSessionStatus',
                                status: 'joined',
                                link: this._sessionLink || '',
                                participants: data.count,
                                role: this._liveShareApi?.session?.role,
                                duration: data.duration
                            });
                        }
                    });
                }
            };

            if (proxy.isServiceAvailable) {
                attach();
                // Immediately fetch a snapshot so header and list are correct without waiting
                if (typeof proxy.request === 'function') {
                    proxy.request('getParticipants').then((data: any) => {
                        if (data && this._view) {
                            this._view.webview.postMessage({
                                command: 'updateParticipants',
                                participants: data.participants,
                                count: data.count
                            });
                            this._view.webview.postMessage({
                                command: 'updateSessionStatus',
                                status: 'joined',
                                link: this._sessionLink || '',
                                participants: data.count,
                                role: this._liveShareApi?.session?.role,
                                duration: data.duration
                            });
                        }
                    }).catch(()=>{});
                }
            }

            if (typeof proxy.onDidChangeIsServiceAvailable === 'function') {
                proxy.onDidChangeIsServiceAvailable((available: boolean) => {
                    console.log('[setupGuestParticipantListener] Service availability changed:', available);
                    if (available) {
                        attach();
                        if (typeof proxy.request === 'function') {
                            proxy.request('getParticipants').then((data: any) => {
                                if (data && this._view) {
                                    this._view.webview.postMessage({
                                        command: 'updateParticipants',
                                        participants: data.participants,
                                        count: data.count
                                    });
                                    this._view.webview.postMessage({
                                        command: 'updateSessionStatus',
                                        status: 'joined',
                                        link: this._sessionLink || '',
                                        participants: data.count,
                                        role: this._liveShareApi?.session?.role,
                                        duration: data.duration
                                    });
                                }
                            }).catch(()=>{});
                        }
                    }
                });
            }
        } catch (err) {
            console.warn('[setupGuestParticipantListener] Failed to attach guest listener:', err);
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
            console.log('No existing session found on initial check; show loading');
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'loading',
                    link: '',
                    participants: 0
                });
            }
            // After a brief delay, if there is still no session, ensure UI exits loading state
            setTimeout(() => {
                if (!this._liveShareApi?.session) {
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'updateSessionStatus',
                            status: 'none',
                            link: '',
                            participants: 0
                        });
                    }
                }
            }, 1500);
        }
        this._initialSessionCheckDone = true;
        
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

            this._view.webview.postMessage({
                command: 'updateParticipants',
                participants: [],
                count: 0
            });
            
            // Also clear any session-related state
            this.sessionStartTime = undefined;
            this.stopParticipantMonitoring();
        }
    }

    private participantMonitoringInterval?: NodeJS.Timeout;
    private sessionStartTime?: Date;
    private _requestedHostStartTime = false; // guard to avoid repeated requests as guest
    private _durationUpdateInterval?: NodeJS.Timeout; // interval to push duration updates
    private _hostStartTimeRetryCount = 0; // retry attempts for fetching host session start time

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
            console.warn('[updateParticipantInfo] No active Live Share session.');
            return;
        }

        const session = this._liveShareApi.session;
        const isHost = session.role === vsls.Role.Host;
        console.log(`[updateParticipantInfo] Triggered. Role=${session.role}, Peer count=${this._liveShareApi.peers?.length || 0}`);

        if (!isHost) {
            console.log('[updateParticipantInfo] Skipping update because this client is not host.');
            // Do not return silently—trigger guest fallback so UI reflects local best effort
            this.updateGuestParticipantFallback();
            return;
        }

        try {
            const peers = (this._liveShareApi.peers || []).filter(p => !!p);
            const participantCount = peers.length + 1;
            console.log(`[updateParticipantInfo] Host sees ${participantCount} participants.`);

            const participants: any[] = [];
            let selfName = getCachedDisplayName();
            if (!selfName) {
                try {
                    const r = await getOrInitDisplayName(true);
                    selfName = r.displayName;
                } catch {
                    selfName = undefined;
                }
            }

            participants.push({
                name: selfName || session.user?.displayName || 'You',
                email: session.user?.emailAddress || '',
                role: 'Host'
            });

            for (const peer of peers) {
                console.log('[updateParticipantInfo] Peer object:', JSON.stringify(peer, null, 2));
                participants.push({
                    name: peer?.user?.displayName || 'Unknown',
                    email: peer?.user?.emailAddress || '',
                    role: 'Guest'
                });
            }

            // 🔄 Notify guests
            if (this._sharedService?.notify) {
                console.log('[updateParticipantInfo] Sending participantUpdate notification via shared service:', {
                    count: participantCount,
                    duration: this.getSessionDuration()
                });
                this._sharedService.notify('participantUpdate', {
                    count: participantCount,
                    participants,
                    duration: this.getSessionDuration()
                });
            } else {
                console.warn('[updateParticipantInfo] Shared service not registered yet, cannot notify guests.');
            }

            // 🖥 Update host UI
            if (this._view) {
                console.log('[updateParticipantInfo] Sending updateParticipants message to webview.');
                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants,
                    count: participantCount
                });
                // Keep the session header count in sync without needing a reload
                const session = this._liveShareApi.session;
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'hosting',
                    link: this._sessionLink || '',
                    participants: participantCount,
                    role: session.role,
                    duration: this.getSessionDuration()
                });
            }
        } catch (error) {
            console.error('[updateParticipantInfo] Error:', error);
        }
    }

    // Guest-only: build a temporary participant view from local peers array to avoid stale UI
    private updateGuestParticipantFallback() {
        try {
            if (!this._liveShareApi?.session || this._liveShareApi.session.role !== vsls.Role.Guest) return;
            const peers = (this._liveShareApi.peers || []).filter(p => !!p);
            // Ensure minimum 2 (host + self) even if peers isn't populated yet
            const count = Math.max(2, (peers.length + 1));
            const participants: any[] = [];
            // We may not know host identity yet; show self + placeholders as needed
            const selfName = this._liveShareApi.session.user?.displayName || 'You';
            participants.push({ name: selfName, email: this._liveShareApi.session.user?.emailAddress || '', role: 'Guest' });
            for (const peer of peers) {
                participants.push({ name: peer?.user?.displayName || 'Unknown', email: peer?.user?.emailAddress || '', role: 'Host/Guest' });
            }
            if (this._view) {
                this._view.webview.postMessage({ command: 'updateParticipants', participants, count });
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'joined',
                    link: this._sessionLink || '',
                    participants: count,
                    role: this._liveShareApi.session.role,
                    duration: this.getSessionDuration()
                });
            }
        } catch {}
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
            this.stopDurationUpdater();
            this.clearManualInviteLink();
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'ended',
                    link: '',
                    participants: 0
                });

                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants: [],
                    count: 0
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
            this.stopDurationUpdater();
            this.clearManualInviteLink();
            
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
        if (!this.sessionStartTime) return '';
        const now = new Date();
        const diffMs = now.getTime() - this.sessionStartTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
        return `${diffMins}m`;
    }

    private async startLiveShareSession() {
        // Check if a folder is open before starting session
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder before starting a Live Share session.');
            return;
        }

        if (!this._liveShareApi) {
            vscode.window.showErrorMessage('Live Share API not available. Please install Live Share extension.');
            return;
        }

         const confirm = await vscode.window.showWarningMessage(
        'Warning: Closing this folder or opening another project folder will end the Live Share session for all participants.',
        { modal: true },
        'OK'
        );

        if (confirm !== 'OK') {
            // User cancelled, don’t start session
            return;
        }

        try {
            vscode.window.showInformationMessage('Starting Live Share session...');

            const session = await this._liveShareApi.share();

            if (session && session.toString()) {
                const inviteLink = session.toString();
                this._sessionLink = inviteLink;
                vscode.window.showInformationMessage(`Live Share session started! Invite link ${inviteLink}`);
                // Record start time immediately for host so duration begins updating
                if (!this.sessionStartTime) {
                    this.sessionStartTime = new Date();
                    console.log('Host sessionStartTime initialized at startLiveShareSession():', this.sessionStartTime);
                }
                // Register shared service to provide start time to guests
                this.registerSessionInfoServiceIfHost();
                // Start duration updates
                this.startDurationUpdater();

                // Warn host about folder changes ending session
                vscode.window.showWarningMessage(
                    'Warning: Closing this folder or opening another project folder will end the Live Share session for all participants.',
                    { modal: true }
                );

                // Update the UI
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: 'hosting',
                        link: inviteLink
                    });
                }

                // 🧩 Ensure shared service is registered AFTER session starts
                setTimeout(() => {
                    console.log('[startLiveShareSession] Ensuring shared service is registered after share().');
                    this.registerSessionInfoServiceIfHost();
                }, 2000);

                // Push participant info right away
                setTimeout(() => {
                    console.log('[startLiveShareSession] Triggering updateParticipantInfo after share.');
                    this.updateParticipantInfo();
                }, 2500);
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
            this._sessionLink = inviteLink;
            vscode.window.showInformationMessage('Successfully joined Live Share session!');
            // As guest, immediately attempt to fetch host start time
            this.requestHostSessionStartTime();
            this.startDurationUpdater();

            // Update UI 
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'joined',
                    link: inviteLink
                });
            }

            // Immediate participant info after join
            this.updateParticipantInfo();
        } catch (error) {
            console.error('Error joining Live Share session:', error);
            vscode.window.showErrorMessage('Error joining Live Share session: ' + error); 
        }
    }

    private sendTeamMessage(message: string) {
        if (!this._liveShareApi?.session) {
            vscode.window.showWarningMessage('Start or join a Live Share session to use team chat.');
            return;
        }
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
        // Only hosts update team activity
        if (this._liveShareApi?.session?.role !== vsls.Role.Host) return;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateActivity',
                activity: activity
            });
        }
    }


    dispose() {
        // Stop participant monitoring
        this.stopParticipantMonitoring();
        
        // Dispose of any other resources
        this._view = undefined;
        this._liveShareApi = undefined;
    }

    // --- Shared session start time support ---
    private async registerSessionInfoServiceIfHost() {
        try {
            console.log('[registerSessionInfoServiceIfHost] Attempting to register shared service.');
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== vsls.Role.Host) {
                return;
            }
            if (this._sharedService) {
                return; // already registered
            }
            // registerService is only available to host
            const anyApi: any = this._liveShareApi as any;
            if (typeof anyApi.registerService === 'function') {
                this._sharedService = await anyApi.registerService(this._sharedServiceName);
                if (this._sharedService) {
                    console.log(`[registerSessionInfoServiceIfHost] Shared service "${this._sharedServiceName}" registered successfully.`);
                    if (typeof this._sharedService.onRequest === 'function') {
                        this._sharedService.onRequest('getSessionInfo', async () => {
                            console.log('[registerSessionInfoServiceIfHost] Received getSessionInfo request.');
                            return { startTime: this.sessionStartTime?.toISOString() || new Date().toISOString() };
                        });
                        // Provide a participant snapshot on demand for guests joining late
                        this._sharedService.onRequest('getParticipants', async () => {
                            try {
                                const peers = (this._liveShareApi?.peers || []).filter(p => !!p);
                                const participantCount = peers.length + 1;
                                const participants: any[] = [];
                                let selfName = getCachedDisplayName();
                                if (!selfName) {
                                    try {
                                        const r = await getOrInitDisplayName(true);
                                        selfName = r.displayName;
                                    } catch {
                                        selfName = undefined;
                                    }
                                }
                                participants.push({
                                    name: selfName || this._liveShareApi?.session?.user?.displayName || 'You',
                                    email: this._liveShareApi?.session?.user?.emailAddress || '',
                                    role: 'Host'
                                });
                                for (const peer of peers) {
                                    participants.push({
                                        name: peer?.user?.displayName || 'Unknown',
                                        email: peer?.user?.emailAddress || '',
                                        role: 'Guest'
                                    });
                                }
                                return {
                                    count: participantCount,
                                    participants,
                                    duration: this.getSessionDuration()
                                };
                            } catch (e) {
                                return { count: 1, participants: [], duration: this.getSessionDuration() };
                            }
                        });
                    } else {
                        console.warn('[registerSessionInfoServiceIfHost] Shared service has no onRequest method.');
                    }
                } else {
                    console.warn('[registerSessionInfoServiceIfHost] registerService() returned undefined.');
                }
            }
        } catch (err) {
            console.warn('Failed to register session info service (non-fatal):', err);
        }
    }

    private async requestHostSessionStartTime() {
        if (this._requestedHostStartTime) {
            return;
        }
        this._requestedHostStartTime = true; // set early to avoid spamming
        try {
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== vsls.Role.Guest) {
                return;
            }
            const anyApi: any = this._liveShareApi as any;
            if (typeof anyApi.getSharedService === 'function') {
                const proxy = await anyApi.getSharedService(this._sharedServiceName);
                if (proxy && proxy.isServiceAvailable && typeof proxy.request === 'function') {
                    const info = await proxy.request('getSessionInfo');
                    if (info && info.startTime) {
                        const hostStart = new Date(info.startTime);
                        if (!isNaN(hostStart.getTime())) {
                            // Only adopt if earlier than our local join time
                            if (!this.sessionStartTime || hostStart.getTime() < this.sessionStartTime.getTime()) {
                                this.sessionStartTime = hostStart;
                                console.log('Guest updated sessionStartTime from host shared service:', this.sessionStartTime);
                                if (this._liveShareApi?.session && this._view) {
                                    const s = this._liveShareApi.session;
                                    this._view.webview.postMessage({
                                        command: 'updateSessionStatus',
                                        status: s.role === vsls.Role.Host ? 'hosting' : 'joined',
                                        link: this._sessionLink || '',
                                        participants: (this._liveShareApi.peers?.length || 0) + 1,
                                        role: s.role,
                                        duration: this.getSessionDuration()
                                    });
                                }
                            }
                        }
                        // Success - reset retry counter
                        this._hostStartTimeRetryCount = 0;
                    }
                } else {
                    console.log('Shared service not yet available; will retry shortly');
                    if (this._hostStartTimeRetryCount < 5) { // up to 5 retries (~15s total)
                        this._hostStartTimeRetryCount++;
                        setTimeout(() => { this._requestedHostStartTime = false; this.requestHostSessionStartTime(); }, 3000);
                    } else {
                        console.log('Max retries reached for fetching host start time; using local join time');
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to obtain host session start time (will fallback to local join time):', err);
        }
    }

    private startDurationUpdater() {
        // Only hosts update duration
        this.stopDurationUpdater();
        if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== vsls.Role.Host) return;
        this._durationUpdateInterval = setInterval(() => {
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== vsls.Role.Host) {
                this.stopDurationUpdater();
                return;
            }
            if (this.sessionStartTime && this._view) {
                const session = this._liveShareApi.session;
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'hosting',
                    link: this._sessionLink || '',
                    participants: (this._liveShareApi.peers?.length || 0) + 1,
                    role: session.role,
                    duration: this.getSessionDuration()
                });
            }
        }, 30000);
    }

    private stopDurationUpdater() {
        if (this._durationUpdateInterval) {
            clearInterval(this._durationUpdateInterval);
            this._durationUpdateInterval = undefined;
        }
    }
    // @ts-ignore
    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.css'));
        const nonce = Date.now().toString();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Collab Agent</title>
        <link href="${styleUri}" rel="stylesheet" />
        </head>
        <body>
        <div class="agent-heading">AGENT</div>
        <div class="section">
            <div class="section-title">🚀 Live Share Session</div>
            <div id="sessionButtons">
            <button class="button" id="startSessionBtn" onclick="startLiveShare()">Start Session</button>
            <button class="button" id="joinLiveShareBtn" onclick="joinLiveShare()">Join Session</button>
            </div>
            <div id="sessionStatus"><div class="status-inactive"><span class="status-indicator loading"></span>Loading session status...</div></div>
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
            <div class="chat-message"><strong>Collab Agent:</strong> Welcome! Start collaborating with your team.</div>
            </div>
            <input type="text" id="chatInput" class="chat-input" placeholder="Start or join a session to chat" disabled onkeypress="handleChatInput(event)" />
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}