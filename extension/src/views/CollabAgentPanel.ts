import * as vscode from 'vscode';
// Live Share is optional; only require if present to avoid activation failure
let vsls: typeof import('vsls') | undefined;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    vsls = require('vsls');
} catch {
    vsls = undefined;
}
import { getCachedDisplayName, getOrInitDisplayName } from '../services/profile-service';

/**
 * Provides the webview panel for the Collab Agent extension.
 * Manages Live Share sessions, participant monitoring, and team collaboration features.  
 * This class implements the VS Code WebviewViewProvider interface.
 */
export class CollabAgentPanelProvider implements vscode.WebviewViewProvider {
    /** The unique identifier for this webview view type */
    public static readonly viewType = 'collabAgent.teamActivity';

    /** The webview view instance for displaying the panel */
    private _view?: vscode.WebviewView;
    
    /** Live Share API instance (optional) */
    private _liveShareApi?: any | null = null;
    
    /** Name of the shared service for propagating session metadata between participants */
    private readonly _sharedServiceName = 'collabAgentSessionInfo';
    
    /** Shared service instance for host-guest communication */
    private _sharedService: any | undefined;
    
    /** Current session invite link for persistence and display */
    private _sessionLink: string | undefined;
    
    /** Flag to track if initial session check has been completed */
    private _initialSessionCheckDone = false;
    
    /** Map of participant user IDs/emails to their display names */
    private _participantNameMap: Map<string, string> = new Map();
    /** Interval to monitor auth state changes */
    private _authMonitorInterval: any | undefined;
    /** Cached last known auth state */
    private _lastAuthState: boolean | undefined;

    /**
     * Creates a new CollabAgentPanelProvider instance.
     * 
     * @param _extensionUri - The URI of the extension for loading resources
     * @param _context - The extension context for state management
     */
    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {
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
        console.log("CollabAgentPanel: resolveWebviewView called");
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

    webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);
        console.log("CollabAgentPanel: HTML set, webview should be ready");

    await this.initializeLiveShare();
    this.startAuthMonitor();

        webviewView.webview.onDidReceiveMessage(
            async (message: any) => {
                console.log('Received message from webview:', message);
                switch (message.command) {
                    case 'startLiveShare':
                        this.startLiveShareSession();
                        return;
                    case 'joinLiveShare':
                        this.joinLiveShareSession();
                        return;
                    case 'endLiveShare':
                        this.endLiveShareSession();
                        return;
                    case 'leaveLiveShare':
                        this.leaveLiveShareSession();
                        return;
                    case 'sendTeamMessage':
                        this.sendTeamMessage(message.text);
                        return;
                    case 'manualSetInviteLink':
                        this.setManualInviteLink(message.link);
                        return;
                    case 'manualClearInviteLink':
                        this.clearManualInviteLink();
                        return;
                    case 'requestStoredLink':
                        this.sendStoredLinkToWebview();
                        return;
                    case 'manualPasteInviteLink':
                        this.pasteInviteLinkFromClipboard();
                        return;
                    case 'installLiveShare':
                        // Install Live Share extension
                        await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-vsliveshare.vsliveshare');
                        vscode.window.showInformationMessage('Live Share extension installation triggered. Reloading to finalize installation...');
                        // Inform webview before reload
                        this._view?.webview.postMessage({ command: 'liveShareInstalling' });
                        // Small delay to allow message to render
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                        return;
                    case 'loginOrSignup':
                        // Trigger sign-in or sign-up flow
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
                        return;
                    // Agent chat box and aiQuery logic moved to AgentPanelProvider
                    // ...existing code...
                    default:
                        console.log('Unknown command received:', message.command);
                }
            },
            undefined,
            []
        );
    }

    /** Key for persisting manual invite links in global state */
    private readonly _persistedLinkKey = 'collabAgent.manualInviteLink';

    /**
     * Sets a manual invite link as fallback when Live Share API doesn't expose the link.
     * 
     * @param link - The invite link to set, or undefined to clear
     */
    private setManualInviteLink(link: string | undefined) {
        if (!link || !link.trim()) {
            if (this._view) {
                this._view.webview.postMessage({ command: 'manualLinkInvalid', reason: 'empty' });
            }
            return;
        }
        const trimmed = link.trim();
        this._sessionLink = trimmed;
        this._context.globalState.update(this._persistedLinkKey, this._sessionLink);
        if (this._view) {
            this._view.webview.postMessage({
                command: 'manualLinkUpdated',
                link: this._sessionLink
            });
            const status = this._liveShareApi?.session?.role === (vsls?.Role?.Host) ? 'hosting' : (this._liveShareApi?.session ? 'joined' : 'none');
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

    /**
     * Clears the manually set invite link and updates the UI.
     */
    private clearManualInviteLink() {
        this._sessionLink = undefined;
        this._context.globalState.update(this._persistedLinkKey, undefined);
        if (this._view) {
            this._view.webview.postMessage({ command: 'manualLinkCleared' });
            const status = this._liveShareApi?.session?.role === (vsls?.Role?.Host) ? 'hosting' : (this._liveShareApi?.session ? 'joined' : 'none');
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

    /**
     * Sends any stored invite link from global state to the webview.
     * Used for restoring session state after extension reload.
     */
    private sendStoredLinkToWebview() {
        const stored = this._context.globalState.get<string | undefined>(this._persistedLinkKey);
        if (stored) {
            this._sessionLink = stored;
            if (this._view) {
                this._view.webview.postMessage({ command: 'storedLink', link: stored });
                if (this._liveShareApi?.session) {
                    const s = this._liveShareApi.session;
                    this._view?.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: s.role === (vsls?.Role?.Host) ? 'hosting' : 'joined',
                        link: stored,
                        participants: (this._liveShareApi.peers?.length || 0) + 1,
                        role: s.role,
                        duration: this.getSessionDuration()
                    });
                }
            }
        }
    }

    /**
     * Attempts to paste an invite link from the system clipboard.
     * Shows appropriate error messages for invalid or empty clipboard content.
     */
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

    /**
     * Initializes the Live Share API and sets up event listeners.
     * Retries on failure with exponential backoff.
     * 
     * @returns Promise that resolves to true if initialization succeeds, false otherwise
     */
    private async initializeLiveShare(): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!vsls || typeof vsls.getApi !== 'function') {
            console.log('Live Share module not available. Skipping initialization.');
            return false;
        }
        this._liveShareApi = await vsls.getApi();
        if (this._liveShareApi) {
            console.log('Live Share API initialized successfully.');
            
            this.setupLiveShareEventListeners();

            if (this._liveShareApi?.session?.role === (vsls?.Role?.Guest)) {
                console.log('[initializeLiveShare] Guest detected, setting up participantUpdate listener.');
                this.setupGuestParticipantListener();
            }
            
            return true;
        } else {
            console.log('Live Share extension not available.');
            setTimeout(() => {
                console.log('Retrying Live Share initialization...');
                this.initializeLiveShare();
            }, 3000);
            return false;
        }
    }

    /**
     * Sets up event listeners for Live Share session and peer changes.
     * Monitors session state, participant changes, and activities.
     */
    private setupLiveShareEventListeners() {
        if (!this._liveShareApi) {
            return;
        }
        try {
            this._liveShareApi.onDidChangeSession((sessionChangeEvent: any) => {
                console.log('Live Share session changed:', sessionChangeEvent);
                this.handleSessionChange(sessionChangeEvent);
            });

            if (typeof (this._liveShareApi as any).onDidChangePeers === 'function') {
                (this._liveShareApi as any).onDidChangePeers((peerChangeEvent: any) => {
                    console.log('Live Share peers changed:', peerChangeEvent);
                    this.updateParticipantInfo();
                    if (this._liveShareApi?.session?.role === (vsls?.Role?.Guest)) {
                        this.updateGuestParticipantFallback();
                    }
                });
            } else {
                console.warn('Live Share API does not expose onDidChangePeers in this environment. Falling back to polling only.');
            }

            if (typeof (this._liveShareApi as any).onActivity === 'function') {
                (this._liveShareApi as any).onActivity((activity: any) => {
                    try {
                        if (!activity) return;
                        const nameStr = String(activity.name || '');
                        if (/session\/(guestJoin|join)/i.test(nameStr)) {
                            const d = activity.data || activity.payload || {};
                            const user = d.user || d.actor || d.participant || {};
                            const key = (user.emailAddress || user.id || user.peerId || '').toLowerCase();
                            const disp = user.displayName || user.loginName || user.userName || d.displayName || d.name;
                            if (key && disp) {
                                this._participantNameMap.set(key, disp);
                            }
                            console.log('Activity hinting at potential participant change:', { name: activity.name, user: user });
                            this.updateParticipantInfo();
                        } else if (/session\/(guestLeave|leave)/i.test(nameStr)) {
                            this.updateParticipantInfo();
                        }
                    } catch {
                    }
                });
            }

            this.monitorSessionState();
        } catch (error) {
            console.error('Error setting up Live Share event listeners:', error);
        }
    }

    /**
     * Handles Live Share session state changes (start, join, end).
     * Updates UI, manages participant monitoring, and handles session timing.
     * 
     * @param sessionChangeEvent - The session change event from Live Share API
     */
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

            if (!this.sessionStartTime || ['joined','started','start','starting'].includes(String(sessionChangeEvent.changeType).toLowerCase())) {
                this.sessionStartTime = new Date();
                console.log('Session start time set to (local clock):', this.sessionStartTime, 'changeType:', sessionChangeEvent.changeType);
            }
            if (session.role === (vsls?.Role?.Host)) {
                this.registerSessionInfoServiceIfHost();
            } else if (session.role === (vsls?.Role?.Guest) && !this._requestedHostStartTime) {
                this.requestHostSessionStartTime();
            }

            const isHost = session.role === (vsls?.Role?.Host);
            let status = 'joined';
            
            if (isHost) {
                status = 'hosting';
            } else if (session.role === (vsls?.Role?.Guest)) {
                status = 'joined';
                this.setupGuestParticipantListener();
                this.updateGuestParticipantFallback();
            }
            
            const sessionLink = session.uri?.toString() || this._sessionLink || '';
            if (sessionLink) {
                this._sessionLink = sessionLink;
            }
            let participantCount = (this._liveShareApi?.peers?.length || 0) + 1;
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
                
                setTimeout(() => {
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'updateSessionStatus',
                            status: 'none',
                            link: '',
                            participants: 0
                        });
                    }
                }, 2000);
            }
            this.stopParticipantMonitoring();
        }
    }

    /**
     * Sets up participant update listeners for guests.
     * Allows guests to receive real-time participant updates from the host.
     */
    private async setupGuestParticipantListener() {
        try {
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== (vsls?.Role?.Guest)) {
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
                            const displayName = getCachedDisplayName();
                            const idOrEmail = this._liveShareApi?.session?.user?.emailAddress || (this._liveShareApi as any)?.session?.user?.id;
                            if (displayName && idOrEmail) {
                                proxy.request('announceParticipant', {
                                    id: (this._liveShareApi as any)?.session?.user?.id,
                                    email: this._liveShareApi?.session?.user?.emailAddress,
                                    displayName
                                }).catch(()=>{});
                            }
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
                                    const displayName = getCachedDisplayName();
                                    const idOrEmail = this._liveShareApi?.session?.user?.emailAddress || (this._liveShareApi as any)?.session?.user?.id;
                                    if (displayName && idOrEmail) {
                                        proxy.request('announceParticipant', {
                                            id: (this._liveShareApi as any)?.session?.user?.id,
                                            email: this._liveShareApi?.session?.user?.emailAddress,
                                            displayName
                                        }).catch(()=>{});
                                    }
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

    /**
     * Monitors the current Live Share session state and updates the UI accordingly.
     * Handles initial session detection and sets up periodic monitoring.
     */
    private monitorSessionState() {
        console.log('monitorSessionState: Checking session state...');
        console.log('monitorSessionState: _liveShareApi exists:', !!this._liveShareApi);
        console.log('monitorSessionState: _liveShareApi.session exists:', !!this._liveShareApi?.session);
        
        if (this._liveShareApi?.session) {
            const session = this._liveShareApi.session;
            console.log('monitorSessionState: Session details:', {
                id: session.id,
                role: session.role,
                isValid: !!(session.id && (session.role === (vsls?.Role?.Host) || session.role === (vsls?.Role?.Guest)))
            });
            
            if (session.id && (session.role === (vsls?.Role?.Host) || session.role === (vsls?.Role?.Guest))) {
                console.log('Found existing active session:', session);
                this.handleSessionChange({ session: session, changeType: 'existing' });
            } else {
                console.log('Found invalid or inactive session, clearing UI state');
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
        
        setInterval(() => {
            this.periodicSessionCheck();
        }, 5000);
    }
    
    /**
     * Performs periodic checks of session state to catch changes
     * that might not trigger event listeners.
     */
    private periodicSessionCheck() {
        if (!this._liveShareApi) {
            return;
        }
        
        const hasSession = !!this._liveShareApi.session;
        const hasValidSession = hasSession && 
            this._liveShareApi.session.id && 
            (this._liveShareApi.session.role === (vsls?.Role?.Host) || this._liveShareApi.session.role === (vsls?.Role?.Guest));
        
        console.log('periodicSessionCheck:', { hasSession, hasValidSession, sessionId: this._liveShareApi.session?.id });
        
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
            
            this.sessionStartTime = undefined;
            this.stopParticipantMonitoring();
        }
    }

    /** Interval timer for monitoring participant changes */
    private participantMonitoringInterval?: NodeJS.Timeout;
    
    /** Timestamp when the current session started */
    private sessionStartTime?: Date;
    
    /** Flag to prevent duplicate requests for host session start time */
    private _requestedHostStartTime = false;
    
    /** Interval timer for pushing duration updates to the UI */
    private _durationUpdateInterval?: NodeJS.Timeout;
    
    /** Number of retry attempts for fetching host session start time */
    private _hostStartTimeRetryCount = 0;

    /**
     * Starts monitoring participants in the Live Share session.
     * Updates participant information every 2 seconds for responsive UI updates.
     */
    private startParticipantMonitoring() {
        this.stopParticipantMonitoring();
        
        this.participantMonitoringInterval = setInterval(() => {
            this.updateParticipantInfo();
        }, 2000);

        this.updateParticipantInfo();
    }

    /**
     * Stops the participant monitoring interval timer.
     */
    private stopParticipantMonitoring() {
        if (this.participantMonitoringInterval) {
            clearInterval(this.participantMonitoringInterval);
            this.participantMonitoringInterval = undefined;
        }
    }

    /**
     * Updates participant information for the current session.
     * Only hosts can update participant info and notify guests.
     */
    private async updateParticipantInfo() {
        if (!this._liveShareApi?.session) {
            console.warn('[updateParticipantInfo] No active Live Share session.');
            return;
        }

        const session = this._liveShareApi.session;
    const isHost = session.role === (vsls?.Role?.Host);
        console.log(`[updateParticipantInfo] Triggered. Role=${session.role}, Peer count=${this._liveShareApi.peers?.length || 0}`);

        if (!isHost) {
            console.log('[updateParticipantInfo] Skipping update because this client is not host.');
            this.updateGuestParticipantFallback();
            return;
        }

        try {
            const peers = (this._liveShareApi.peers || []).filter(Boolean);
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

            const hostIdKey = (session.user?.emailAddress || (session as any)?.user?.id || '').toLowerCase();
            const announcedHostName = hostIdKey ? this._participantNameMap.get(hostIdKey) : undefined;
            const hostResolvedName = announcedHostName
                || selfName
                || session.user?.displayName
                || (session as any)?.user?.loginName
                || (session as any)?.user?.userName
                || session.user?.emailAddress
                || 'You';
            participants.push({
                name: hostResolvedName,
                email: session.user?.emailAddress || '',
                role: 'Host'
            });

            for (const peer of peers) {
                console.log('[updateParticipantInfo] Peer object:', JSON.stringify(peer, null, 2));
                const resolvedName = this.resolvePeerDisplayName(peer);
                participants.push({
                    name: resolvedName,
                    email: peer?.user?.emailAddress || '',
                    role: 'Guest'
                });
            }

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

            if (this._view) {
                console.log('[updateParticipantInfo] Sending updateParticipants message to webview.');
                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants,
                    count: participantCount
                });
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

    /**
     * Resolves the display name for a Live Share peer.
     * Uses announced names, user properties, or fallback to 'Unknown'.
     * 
     * @param peer - The peer object from Live Share API
     * @returns The resolved display name for the peer
     */
    private resolvePeerDisplayName(peer: any): string {
        try {
            const key = (peer?.user?.emailAddress || peer?.user?.id || peer?.id || '').toLowerCase();
            const announced = key ? this._participantNameMap.get(key) : undefined;
            if (announced) return announced;
            return (
                peer?.user?.displayName
                || peer?.displayName
                || (peer as any)?.user?.loginName
                || (peer as any)?.user?.userName
                || peer?.user?.emailAddress
                || 'Unknown'
            );
        } catch {
            return 'Unknown';
        }
    }

    /**
     * Provides fallback participant information for guests when host updates aren't available.
     * Builds temporary participant view from local peer data.
     */
    private updateGuestParticipantFallback() {
        try {
            if (!this._liveShareApi?.session || this._liveShareApi.session.role !== (vsls?.Role?.Guest)) return;
            const peers = (this._liveShareApi.peers || []).filter(Boolean);
            const count = Math.max(2, (peers.length + 1));
            const participants: any[] = [];
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

    /**
     * Ends the current Live Share session (host only).
     * Updates UI state and notifies participants.
     */
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
            console.log('Host role constant:', vsls?.Role?.Host);
            
            if (this._liveShareApi.session.role !== (vsls?.Role?.Host)) {
                vscode.window.showWarningMessage('Only the session host can end the session.');
                return;
            }

            console.log('Calling end() on Live Share API...');
            // End the session
            await this._liveShareApi.end();
            console.log('Live Share end() completed');
            
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
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'resetButtonState',
                    buttonType: 'end'
                });
            }
        }
    }

    /**
     * Leaves the current Live Share session (guest only).
     * Clears local session state and updates UI.
     */
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
            
            if (session.role === (vsls?.Role?.Host)) {
                vscode.window.showWarningMessage('Hosts cannot leave their own session. Use "End Session" instead.');
                return;
            }

            console.log('Calling end() on Live Share API to leave session...');
            await this._liveShareApi.end();
            console.log('Live Share leave completed');
            
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
            
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'resetButtonState',
                    buttonType: 'leave'
                });
            }
        }
    }

    /**
     * Calculates and formats the current session duration.
     * 
     * @returns Formatted duration string (e.g., "1h 30m" or "45m")
     */
    private getSessionDuration(): string {
        if (!this.sessionStartTime) return '';
        const now = new Date();
        const diffMs = now.getTime() - this.sessionStartTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
        return `${diffMins}m`;
    }

    /**
     * Starts a new Live Share session as host.
     * Validates workspace state, creates session, and sets up monitoring.
     */
    private async startLiveShareSession() {
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
                if (!this.sessionStartTime) {
                    this.sessionStartTime = new Date();
                    console.log('Host sessionStartTime initialized at startLiveShareSession():', this.sessionStartTime);
                }
                this.registerSessionInfoServiceIfHost();
                // Start duration updates
                this.startDurationUpdater();

                vscode.window.showWarningMessage(
                    'Warning: Closing this folder or opening another project folder will end the Live Share session for all participants.',
                    { modal: true }
                );

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

    /**
     * Joins an existing Live Share session as guest.
     * Prompts for invite link and establishes connection.
     */
    private async joinLiveShareSession() {
        if (!this._liveShareApi) {
            vscode.window.showErrorMessage('Live Share API not available. Please install Live Share extension.');
            return;
        }

        try {
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
                return;
            }

            vscode.window.showInformationMessage('Joining Live Share session...');

            const inviteUri = vscode.Uri.parse(inviteLink.trim());
            await this._liveShareApi.join(inviteUri);
            this._sessionLink = inviteLink;
            vscode.window.showInformationMessage('Successfully joined Live Share session!');
            this.requestHostSessionStartTime();
            this.startDurationUpdater();

            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'joined',
                    link: inviteLink
                });
            }

            this.updateParticipantInfo();
        } catch (error) {
            console.error('Error joining Live Share session:', error);
            vscode.window.showErrorMessage('Error joining Live Share session: ' + error); 
        }
    }

    /**
     * Sends a team message in the current Live Share session.
     * 
     * @param message - The message text to send
     */
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

    /**
     * Updates team activity information (host only).
     * 
     * @param activity - The activity data to update
     */
    public updateTeamActivity(activity: any) {
        if (this._liveShareApi?.session?.role !== (vsls?.Role?.Host)) return;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateActivity',
                activity: activity
            });
        }
    }

    /**
     * Disposes of the panel provider and cleans up resources.
     * Stops monitoring intervals and clears references.
     */
    dispose() {
        this.stopParticipantMonitoring();
        this.stopAuthMonitor();
        
        this._view = undefined;
        this._liveShareApi = undefined;
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
     * Registers a shared service for host-guest communication (host only).
     * Enables guests to receive session info and participant updates.
     */
    private async registerSessionInfoServiceIfHost() {
        try {
            console.log('[registerSessionInfoServiceIfHost] Attempting to register shared service.');
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== (vsls?.Role?.Host)) {
                return;
            }
            if (this._sharedService) {
                return;
            }
            const anyApi: any = this._liveShareApi as any;
            const hostShareFn = anyApi.shareService || anyApi.registerService;
            if (typeof hostShareFn === 'function') {
                this._sharedService = await hostShareFn.call(anyApi, this._sharedServiceName);
                if (this._sharedService) {
                    console.log(`[registerSessionInfoServiceIfHost] Shared service "${this._sharedServiceName}" registered successfully.`);
                    if (typeof this._sharedService.onRequest === 'function') {
                        this._sharedService.onRequest('getSessionInfo', async () => {
                            console.log('[registerSessionInfoServiceIfHost] Received getSessionInfo request.');
                            return { startTime: this.sessionStartTime?.toISOString() || new Date().toISOString() };
                        });
                        this._sharedService.onRequest('announceParticipant', async (payload: any) => {
                            try {
                                const key: string = (payload?.id || payload?.email || '').toLowerCase();
                                const name: string = payload?.displayName || '';
                                if (key && name) {
                                    this._participantNameMap.set(key, name);
                                    this.updateParticipantInfo();
                                }
                                return { ok: true };
                            } catch {
                                return { ok: false };
                            }
                        });
                        this._sharedService.onRequest('getParticipants', async () => {
                            try {
                                const peers = (this._liveShareApi?.peers || []).filter(Boolean);
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
                    if (typeof this._sharedService.onNotify === 'function') {
                        this._sharedService.onNotify('announceParticipant', (payload: any, sender?: any) => {
                            try {
                                const fromSender = sender && (sender.user?.emailAddress || sender.user?.id || sender.id);
                                const key: string = (payload?.email || payload?.id || fromSender || '').toLowerCase();
                                const name: string = payload?.displayName || payload?.name || '';
                                if (key && name) {
                                    this._participantNameMap.set(key, name);
                                    this.updateParticipantInfo();
                                }
                            } catch {}
                        });
                    }
                    } else {
                    console.warn('[registerSessionInfoServiceIfHost] shareService() returned undefined.');
                }
            }
        } catch (err) {
            console.warn('Failed to register session info service (non-fatal):', err);
        }
    }

    /**
     * Requests the session start time from the host (guest only).
     * Synchronizes session duration display across all participants.
     */
    private async requestHostSessionStartTime() {
        if (this._requestedHostStartTime) {
            return;
        }
        this._requestedHostStartTime = true;
        try {
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== (vsls?.Role?.Guest)) {
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
                            if (!this.sessionStartTime || hostStart.getTime() < this.sessionStartTime.getTime()) {
                                this.sessionStartTime = hostStart;
                                console.log('Guest updated sessionStartTime from host shared service:', this.sessionStartTime);
                                if (this._liveShareApi?.session && this._view) {
                                    const s = this._liveShareApi.session;
                                    this._view.webview.postMessage({
                                        command: 'updateSessionStatus',
                                        status: s.role === (vsls?.Role?.Host) ? 'hosting' : 'joined',
                                        link: this._sessionLink || '',
                                        participants: (this._liveShareApi.peers?.length || 0) + 1,
                                        role: s.role,
                                        duration: this.getSessionDuration()
                                    });
                                }
                            }
                        }
                        this._hostStartTimeRetryCount = 0;
                    }
                } else {
                    console.log('Shared service not yet available; will retry shortly');
                    if (this._hostStartTimeRetryCount < 5) {
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

    /**
     * Starts the duration updater interval (host only).
     * Periodically updates the session duration in the UI.
     */
    private startDurationUpdater() {
        this.stopDurationUpdater();
    if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== (vsls?.Role?.Host)) return;
        this._durationUpdateInterval = setInterval(() => {
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== (vsls?.Role?.Host)) {
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

    /**
     * Stops the duration updater interval timer.
     */
    private stopDurationUpdater() {
        if (this._durationUpdateInterval) {
            clearInterval(this._durationUpdateInterval);
            this._durationUpdateInterval = undefined;
        }
    }
    
    /**
     * Generates the HTML content for the webview panel.
     * 
     * @param webview - The webview instance for generating resource URIs
     * @returns The complete HTML string for the panel
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        // Example: you would check for Live Share and login status here
        // This function is now async to allow awaiting getHtml()
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

            const homeScreen = new (require('./HomeScreenPanel')).HomeScreenPanel(this._extensionUri, this._context);
            const homeHtml = await homeScreen.getHtml(webview, liveShareInstalled, loggedIn, userInfo);
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
            <style>
            .tab-header { display: flex; gap: 8px; margin-bottom: 16px; justify-content: center; }
            .tab-btn { padding: 6px 18px; border: none; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 6px 6px 0 0; cursor: pointer; font-weight: 500; font-size: 15px; }
            .tab-btn.active { background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); border-bottom: 2px solid var(--vscode-tab-activeBorder); }
            .tab-panel { display: none; }
            .back-btn { position: absolute; top: 16px; left: 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 4px; border: none; padding: 6px 14px; font-size: 13px; cursor: pointer; }
            .back-btn:hover { background: var(--vscode-button-hoverBackground); }
            </style>
            </head>
            <body>
            <div class="tab-header">
                <button class="tab-btn" id="tab-home" data-tab="home">Home</button>
                <button class="tab-btn" id="tab-live" data-tab="live">Live Share</button>
                <button class="tab-btn" id="tab-agent" data-tab="agent">Agent Bot</button>
            </div>
            <div id="panel-home" class="tab-panel" style="display:block;">${homeHtml}</div>
            <div id="panel-live" class="tab-panel">
                <div class="agent-heading">Live Share</div>
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
            </div>
            <div id="panel-agent" class="tab-panel">
                <div class="agent-heading">Agent Bot</div>
                <div class="section">
                    <div class="section-title">🏢 Team & Project Management</div>
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
                    <h3>🤖 AI Agent</h3>
                    <div id="ai-chat-log" class="chat-log"></div>
                    <div class="chat-input-container">
                        <input type="text" id="ai-chat-input" placeholder="Ask the agent..." />
                        <button id="ai-chat-send">Send</button>
                    </div>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
            <script nonce="${nonce}">
            (function(){
                function showTab(tab) {
                    document.getElementById('panel-home').style.display = tab==='home' ? 'block' : 'none';
                    document.getElementById('panel-live').style.display = tab==='live' ? 'block' : 'none';
                    document.getElementById('panel-agent').style.display = tab==='agent' ? 'block' : 'none';
                    document.getElementById('tab-home').classList.toggle('active', tab==='home');
                    document.getElementById('tab-live').classList.toggle('active', tab==='live');
                    document.getElementById('tab-agent').classList.toggle('active', tab==='agent');
                }
                document.getElementById('tab-home').addEventListener('click', function(){ showTab('home'); });
                document.getElementById('tab-live').addEventListener('click', function(){ showTab('live'); });
                document.getElementById('tab-agent').addEventListener('click', function(){ showTab('agent'); });
                // Initial state: home only
                showTab('home');
            })();
            </script>
            </body>
            </html>`;
        })();
    }
}