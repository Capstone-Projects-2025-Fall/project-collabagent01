import { SessionSyncService } from '../services/session-sync-service';
import { GitService } from '../services/git-service';
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
import { insertLiveShareActivity, insertLiveShareSessionEnd } from '../services/team-activity-service';
import { getCurrentUser } from '../auth/supabaseClient';

/**
 * Provides Live Share functionality for the Collab Agent extension.
 * Manages Live Share sessions, participant monitoring, and session communication.
 */

export class LiveShareManager {
    //Live Share API instance (optional)
    private _liveShareApi?: any | null = null;
    
    //Current session invite link for persistence and display
    private _sessionLink: string | undefined;
    
    //Flag to track if initial session check has been completed
    private _initialSessionCheckDone = false;

    private _sessionSyncService: SessionSyncService;
    private _gitService?: GitService;

    //Git diff captured at session start (baseline for comparison)
    private _sessionStartDiff?: string;

    //Key for persisting manual invite links in global state
    private readonly _persistedLinkKey = 'collabAgent.manualInviteLink';

    //Key for current team in global state (matches AgentPanel)
    private readonly _teamStateKey = 'collabAgent.currentTeam';

    //Interval timer for monitoring participant changes
    private participantMonitoringInterval?: NodeJS.Timeout;
    
    //Timestamp when the current session started
    private sessionStartTime?: Date;

    //Current session ID for tracking
    private currentSessionId?: string;

    //Interval timer for pushing duration updates to the UI
    private _durationUpdateInterval?: NodeJS.Timeout;

    //Reference to the webview view for sending messages
    private _view?: vscode.WebviewView;

    // Back-compat for older tests: cache of announced participant names
    private _participantNameMap: Map<string, string> = new Map();

    

    /**
     * Creates a new LiveShareManager instance.
     * 
     * @param _context - The extension context for state management
     */
    constructor(private readonly _context: vscode.ExtensionContext) {
        this._sessionSyncService = new SessionSyncService();

        // Initialize git service
        try {
            this._gitService = new GitService();
        } catch (error) {
            console.log('[LiveShareManager] Git service not available:', error);
        }

        // Set up callback for real time participant updates from Supabase
        this._sessionSyncService.setOnParticipantChange((participants) => {
            console.log('[LiveShareManager] Received participant update from Supabase:', participants);
            
            // Convert to UI format
            const participantList = participants.map(p => ({
                name: p.github_username || 'Unknown',
                email: '',
                role: p.peer_number === 1 ? 'Host' : 'Guest'
            }));

            // Update UI
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants: participantList,
                    count: participantList.length
                });

                // Also update session status with correct count
                const session = this._liveShareApi?.session;
                if (session) {
                    this._view.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: session.role === (vsls?.Role?.Host) ? 'hosting' : 'joined',
                        link: this._sessionLink || '',
                        participants: participantList.length,
                        role: session.role,
                        duration: this.getSessionDuration()
                    });
                }
            }
        });
    }

    /**
     * Sets the webview reference for UI updates
     * @param view - The webview view instance
     */
    public setView(view: vscode.WebviewView) {
        this._view = view;
    }

    /**
     * Initializes the Live Share API and sets up event listeners.
     * Retries on failure with exponential backoff.
     * 
     * @returns Promise that resolves to true if initialization succeeds, false otherwise
     */
    public async initializeLiveShare(): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!vsls || typeof vsls.getApi !== 'function') {
            console.log('Live Share module not available. Skipping initialization.');
            return false;
        }
        this._liveShareApi = await vsls.getApi();
        if (this._liveShareApi) {
            console.log('Live Share API initialized successfully.');
            
            this.setupLiveShareEventListeners();
            
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
                (this._liveShareApi as any).onDidChangePeers(async (peerChangeEvent: any) => {
                    console.log('Live Share peers changed:', peerChangeEvent);
                    
                    // Load participants from Supabase instead of using Live Share API
                    const session = this._liveShareApi?.session;
                    if (session?.id) {
                        console.log('[onDidChangePeers] Loading participants from Supabase for session:', session.id);
                        
                        // Wait a moment for the guest to announce their presence in Supabase
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        await this.loadParticipantsFromSupabase(session.id);
                    }
                });
            } else {
                console.warn('Live Share API does not expose onDidChangePeers in this environment. Falling back to polling only.');
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
    private async handleSessionChange(sessionChangeEvent: any) {
        const session = sessionChangeEvent.session;
        console.log('[DEBUG] handleSessionChange START - session exists:', !!session, 'session.id:', session?.id);
        console.log('handleSessionChange called with session:', session);
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

            if (session.id) {
                console.log('[DEBUG] About to call announcePresenceViaSupabase');

                // Store current session ID for later use
                this.currentSessionId = session.id;

                // Create session snapshot at session start
                if (this._gitService) {
                    this._gitService.createSessionSnapshot().then(stashName => {
                        if (stashName) {
                            console.log('[LiveShareManager] Created session snapshot');
                        }
                    }).catch(err => {
                        console.error('[LiveShareManager] Failed to create session snapshot:', err);
                    });
                }

                // Announce presence via Supabase
                this.announcePresenceViaSupabase(session);

                console.log('[DEBUG] About to call loadParticipantsFromSupabase');
                // Load all participants from Supabase
                this.loadParticipantsFromSupabase(session.id);

                // Track Live Share event in team activity feed
                const isHost = session.role === (vsls?.Role?.Host);
                const eventType = isHost ? 'live_share_started' : 'live_share_joined';
                this.insertLiveShareEvent(eventType, session.id);
            }


            const isHost = session.role === (vsls?.Role?.Host);
            let status = 'joined';
            
            if (isHost) {
                status = 'hosting';
            } else if (session.role === (vsls?.Role?.Guest)) {
                status = 'joined';
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

            // Track session end in activity feed with participant details
            // IMPORTANT: Await this before cleanup so backend can query participants
            await this.insertLiveShareSessionEndEvent();

            this._sessionSyncService.leaveSession();
            this.sessionStartTime = undefined;
            this.currentSessionId = undefined;
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
 * Announce your presence in the session via Supabase
 */
    private async announcePresenceViaSupabase(session: any) {
        console.log('[DEBUG] announcePresenceViaSupabase called with session.id:', session.id);
        try {
            const displayName = getCachedDisplayName();
            if (!displayName) {
                console.log('[SessionSync] No display name cached, getting from Supabase...');
                const result = await getOrInitDisplayName(true);
                if (result.displayName) {
                    await this._sessionSyncService.joinSession(
                        session.id,
                        result.displayName,
                        session.peerNumber || 0
                    );
                }
            } else {
                await this._sessionSyncService.joinSession(
                    session.id,
                    displayName,
                    session.peerNumber || 0
                );
            }
        } catch (err) {
            console.error('[SessionSync] Failed to announce presence:', err);
        }
    }

    /**
     * Load all participants from Supabase and update UI
     */
    private async loadParticipantsFromSupabase(sessionId: string) {
        try {
            const participants = await this._sessionSyncService.getParticipants(sessionId);
            console.log('[SessionSync] Loaded participants from Supabase:', participants);

            // Convert to UI format
            const participantList = participants.map(p => ({
                name: p.github_username || 'Unknown',
                email: '',
                role: p.peer_number === 1 ? 'Host' : 'Guest'
            }));

            // Update UI
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants: participantList,
                    count: participantList.length
                });

                // Also update session status with correct count
                const session = this._liveShareApi?.session;
                if (session) {
                    this._view.webview.postMessage({
                        command: 'updateSessionStatus',
                        status: session.role === (vsls?.Role?.Host) ? 'hosting' : 'joined',
                        link: this._sessionLink || '',
                        participants: participantList.length,
                        role: session.role,
                        duration: this.getSessionDuration()
                    });
                }
            }
        } catch (err) {
            console.error('[SessionSync] Failed to load participants:', err);
        }
    }

    /**
     * Inserts a Live Share event into the team activity feed
     * @param eventType - Type of event: 'live_share_started' | 'live_share_joined'
     * @param sessionId - Optional session ID for reference
     */
    private async insertLiveShareEvent(
        eventType: 'live_share_started' | 'live_share_joined',
        sessionId?: string
    ) {
        try {
            // Get current team ID
            const teamId = this._context.globalState.get<string>(this._teamStateKey);
            if (!teamId) {
                console.log('[LiveShareManager] No active team, skipping activity insert');
                return;
            }

            // Get current user
            const user = await getCurrentUser();
            if (!user?.id) {
                console.log('[LiveShareManager] No authenticated user, skipping activity insert');
                return;
            }

            // Get display name
            let displayName = getCachedDisplayName();
            if (!displayName) {
                const result = await getOrInitDisplayName(true);
                displayName = result.displayName || 'Unknown User';
            }

            // Insert activity
            const result = await insertLiveShareActivity(
                teamId,
                user.id,
                eventType,
                displayName,
                sessionId
            );

            if (result.success) {
                console.log('[LiveShareManager] Live Share activity inserted successfully');

                // Notify webview to refresh activity feed
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'refreshActivityFeed'
                    });
                }
            } else {
                console.error('[LiveShareManager] Failed to insert activity:', result.error);
            }
        } catch (err) {
            console.error('[LiveShareManager] Exception inserting Live Share event:', err);
        }
    }

    /**
     * Inserts a Live Share session end event with participant details into the team activity feed
     */
    private async insertLiveShareSessionEndEvent() {
        try {
            // Only insert if we have session tracking data
            if (!this.sessionStartTime || !this.currentSessionId) {
                console.log('[LiveShareManager] No session data, skipping session end event');
                return;
            }

            // Get current team ID
            const teamId = this._context.globalState.get<string>(this._teamStateKey);
            if (!teamId) {
                console.log('[LiveShareManager] No active team, skipping activity insert');
                return;
            }

            // Get current user
            const user = await getCurrentUser();
            if (!user?.id) {
                console.log('[LiveShareManager] No authenticated user, skipping activity insert');
                return;
            }

            // Get display name
            let displayName = getCachedDisplayName();
            if (!displayName) {
                const result = await getOrInitDisplayName(true);
                displayName = result.displayName || 'Unknown User';
            }

            // Calculate duration in minutes
            const now = new Date();
            const durationMs = now.getTime() - this.sessionStartTime.getTime();
            const durationMinutes = Math.floor(durationMs / 60000);

            // Get git diff of changes made DURING the session
            let sessionChanges = '(git not available)';

            console.log('[LiveShareManager] _gitService exists:', !!this._gitService);
            if (this._gitService) {
                try {
                    sessionChanges = await this._gitService.getSessionChanges();
                    console.log('[LiveShareManager] Captured session changes, length:', sessionChanges.length);
                } catch (err) {
                    console.error('[LiveShareManager] Failed to get session changes:', err);
                    sessionChanges = `Error capturing changes: ${err}`;
                }
            } else {
                console.log('[LiveShareManager] No git service available, using placeholder changes');
            }

            // Create the live_share_ended event FIRST (without snapshot_id yet)
            console.log('[LiveShareManager] Creating live_share_ended event...');
            const result = await insertLiveShareSessionEnd(
                teamId,
                user.id,
                displayName,
                this.currentSessionId,
                durationMinutes,
                undefined  // Don't link snapshot yet
            );
            console.log('[LiveShareManager] Event creation result:', result);

            // Then create the snapshot which will trigger edge function
            // Edge function will find the live_share_ended event and update it with AI summary
            console.log('[LiveShareManager] Checking if should create snapshot - gitService:', !!this._gitService, 'result.success:', result.success);

            // Always create snapshot if we have an event (even if git service failed)
            if (result.success) {
                console.log('[LiveShareManager] Creating snapshot with changes...');
                try {
                    const snapshotResult = await this.insertLiveShareSummary(
                        teamId,
                        user.id,
                        displayName,
                        this.currentSessionId,
                        sessionChanges
                    );

                    console.log('[LiveShareManager] Snapshot result:', snapshotResult);
                    if (snapshotResult.snapshotId) {
                        console.log('[LiveShareManager] Created snapshot with ID:', snapshotResult.snapshotId);
                        console.log('[LiveShareManager] Edge function will update the live_share_ended event with AI summary');

                        // Clean up git stash after snapshot is created
                        if (this._gitService) {
                            this._gitService.cleanupSessionSnapshot().catch(err => {
                                console.error('[LiveShareManager] Failed to cleanup git stash:', err);
                            });
                        }
                    } else {
                        console.log('[LiveShareManager] No snapshot ID returned');
                    }
                } catch (err) {
                    console.error('[LiveShareManager] Failed to create snapshot:', err);
                }
            } else {
                console.log('[LiveShareManager] Skipping snapshot creation - event creation failed');
            }

            if (result.success) {
                console.log('[LiveShareManager] Live Share session end activity inserted successfully');

                // Notify webview to refresh activity feed
                if (this._view) {
                    this._view.webview.postMessage({
                        command: 'refreshActivityFeed'
                    });
                }
            } else {
                console.error('[LiveShareManager] Failed to insert session end activity:', result.error);
            }

            // Cleanup git snapshot
            if (this._gitService) {
                await this._gitService.cleanupSessionSnapshot();
            }
        } catch (err) {
            console.error('[LiveShareManager] Exception inserting Live Share session end event:', err);
        }
    }

    /**
     * Inserts a Live Share summary with git diff into file_snapshots
     * @returns Object with snapshot ID
     */
    private async insertLiveShareSummary(
        teamId: string,
        userId: string,
        displayName: string,
        sessionId: string,
        changes: string
    ): Promise<{ snapshotId?: string }> {
        try {
            const { insertLiveShareSummary } = require('../services/team-activity-service');
            const result = await insertLiveShareSummary(
                teamId,
                userId,
                displayName,
                sessionId,
                changes
            );

            if (result.success) {
                console.log('[LiveShareManager] Live Share summary inserted successfully');
                return { snapshotId: result.snapshotId };
            } else {
                console.error('[LiveShareManager] Failed to insert summary:', result.error);
                return {};
            }
        } catch (err) {
            console.error('[LiveShareManager] Exception inserting Live Share summary:', err);
            return {};
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
            this.currentSessionId = undefined;
            this.stopParticipantMonitoring();
        }
    }

    /**
     * Starts monitoring participants in the Live Share session.
     * Updates participant information every 2 seconds for responsive UI updates.
     */
    private startParticipantMonitoring() {
        this.stopParticipantMonitoring();
        
        this.participantMonitoringInterval = setInterval(async () => {
            // Use Supabase data instead of Live Share API
            const session = this._liveShareApi?.session;
            if (session?.id) {
                await this.loadParticipantsFromSupabase(session.id);
            }
        }, 2000);

        // Initial load
        const session = this._liveShareApi?.session;
        if (session?.id) {
            this.loadParticipantsFromSupabase(session.id);
        }
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
     * Sets a manual invite link as fallback when Live Share API doesn't expose the link.
     * 
     * @param link - The invite link to set, or undefined to clear
     */
    public setManualInviteLink(link: string | undefined) {
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
    public clearManualInviteLink() {
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
    public sendStoredLinkToWebview() {
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
    public async pasteInviteLinkFromClipboard() {
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
     * Ends the current Live Share session (host only).
     * Updates UI state and notifies participants.
     */
    public async endLiveShareSession() {
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

            // IMPORTANT: Generate the session summary BEFORE cleanup
            // so the backend can query participants from session_participants table
            await this.insertLiveShareSessionEndEvent();

            // Cleanup all participants from Supabase
            const sessionId = this._liveShareApi.session.id;
            if (sessionId) {
                await this._sessionSyncService.cleanupSession(sessionId);
            }

            // End the session
            await this._liveShareApi.end();
            console.log('Live Share end() completed');

            this.sessionStartTime = undefined;
            this.currentSessionId = undefined;
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
    public async leaveLiveShareSession() {
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
            
            // Remove participant record from Supabase before leaving
            await this._sessionSyncService.leaveSession();

            await this._liveShareApi.end();
            console.log('Live Share leave completed');

            this.sessionStartTime = undefined;
            this.currentSessionId = undefined;
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
    public async startLiveShareSession() {
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
            // User cancelled, don't start session
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

            } else {
                console.warn('Live Share session creation failed or was cancelled - this may be due to Live Share extension issues');
                // Don't show intrusive error popup, just log the issue
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
    public async joinLiveShareSession() {
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
            this.startDurationUpdater();

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

    /**
     * Sends a team message in the current Live Share session.
     * 
     * @param message - The message text to send
     */
    public sendTeamMessage(message: string) {
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
     * Back-compat: Resolve a peer's display name using announced map or peer fields.
     */
    private resolvePeerDisplayName(peer: any): string {
        try {
            const key = (peer?.user?.emailAddress || peer?.user?.id || peer?.id || '').toLowerCase();
            const announced = key ? this._participantNameMap.get(key) : undefined;
            if (announced) return announced;
            return (
                peer?.user?.displayName ||
                peer?.displayName ||
                (peer as any)?.user?.loginName ||
                (peer as any)?.user?.userName ||
                peer?.user?.emailAddress ||
                'Unknown'
            );
        } catch {
            return 'Unknown';
        }
    }

    /**
     * Back-compat: Update participant info (host only) and notify shared service if present.
     */
    private async updateParticipantInfo() {
        if (!this._liveShareApi?.session) {
            return;
        }
        const session = this._liveShareApi.session;
        const isHost = session.role === (vsls?.Role?.Host);
        if (!isHost) return;

        try {
            const peers = (this._liveShareApi.peers || []).filter(Boolean);
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
                name: selfName || session.user?.displayName || 'You',
                email: session.user?.emailAddress || '',
                role: 'Host'
            });
            for (const peer of peers) {
                const resolvedName = this.resolvePeerDisplayName(peer);
                participants.push({
                    name: resolvedName,
                    email: peer?.user?.emailAddress || '',
                    role: 'Guest'
                });
            }

            // Notify any legacy shared service listeners
            const shared: any = (this as any)._sharedService;
            if (shared && typeof shared.notify === 'function') {
                shared.notify('participantUpdate', {
                    count: participantCount,
                    participants,
                    duration: this.getSessionDuration()
                });
            }

            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateParticipants',
                    participants,
                    count: participantCount
                });
                this._view.webview.postMessage({
                    command: 'updateSessionStatus',
                    status: 'hosting',
                    link: this._sessionLink || '',
                    participants: participantCount,
                    role: session.role,
                    duration: this.getSessionDuration()
                });
            }
        } catch {
            // swallow in tests
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
     * Disposes of the Live Share manager and cleans up resources.
     * Stops monitoring intervals and clears references.
     */
    public dispose() {
        this.stopParticipantMonitoring();
        this.stopDurationUpdater();
        
        this._view = undefined;
        this._liveShareApi = undefined;
    }

    /**
     * Compatibility shim for older tests expecting a requestHostSessionStartTime method.
     * In the current architecture we sync via Supabase, but for tests (and
     * backwards compatibility) we still attempt to fetch the host start time
     * via Live Share shared service if available.
     */
    private async requestHostSessionStartTime() {
        try {
            // Only guests should request the host start time
            if (!this._liveShareApi || !this._liveShareApi.session || this._liveShareApi.session.role !== (vsls?.Role?.Guest)) {
                return;
            }
            const anyApi: any = this._liveShareApi as any;
            if (typeof anyApi.getSharedService === 'function') {
                const proxy = await anyApi.getSharedService('collabAgentSessionInfo');
                if (proxy && proxy.isServiceAvailable && typeof proxy.request === 'function') {
                    const info = await proxy.request('getSessionInfo');
                    if (info && info.startTime) {
                        const hostStart = new Date(info.startTime);
                        if (!isNaN(hostStart.getTime())) {
                            this.sessionStartTime = hostStart;
                        }
                    }
                }
            }
        } catch {
            // Non-fatal for tests; ignore
        }
    }
}
