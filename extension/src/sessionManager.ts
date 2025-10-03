// sessionManager.ts
import * as vscode from 'vscode';
import * as vsls from 'vsls';

export class SessionManager {
    private participantService: vsls.SharedServiceProxy | null = null;
    private broadcastIntervalId: NodeJS.Timer | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private liveShareApi: vsls.LiveShare
    ) {}

    /**
     * Initialize Live Share participant tracking based on role.
     */
    public async initializeSessionFeatures() {
        const session = this.liveShareApi.session;
        if (!session) {
            console.log('[SessionManager] No Live Share session active yet.');
            return;
        }

        if (session.role === vsls.Role.Host) {
            console.log('[SessionManager] Initializing as Host');
            await this.registerParticipantService();
        } else if (session.role === vsls.Role.Guest) {
            console.log('[SessionManager] Initializing as Guest');
            await this.subscribeToParticipantService();
        }
    }

    /**
     * HOST: Register a shared service to broadcast participant count updates.
     */
    private async registerParticipantService() {
        try {
            // Use getSharedService for registering the participant service
            this.participantService = await this.liveShareApi.getSharedService('participantService');

            if (this.participantService) {
                console.log('[SessionManager] Participant service registered.');
                this.startParticipantBroadcast();
            } else {
                console.warn('[SessionManager] Failed to register participant service as host.');
            }
        } catch (err) {
            console.error('[SessionManager] Failed to register participant service:', err);
        }
    }

    /**
     * GUEST: Subscribe to the host's participant service for updates.
     */
    private async subscribeToParticipantService() {
        try {
            const service = await this.liveShareApi.getSharedService('participantService');
            if (service) {
                console.log('[SessionManager] Subscribed to participantService.');
                service.onNotify('participantUpdate', (e: any) => {
                    if (e?.count !== undefined) {
                        console.log(`[SessionManager] Received participant count: ${e.count}`);
                        vscode.commands.executeCommand('setContext', 'collabAgent.participantCount', e.count);
                    }
                });
            } else {
                console.warn('[SessionManager] participantService not found on guest.');
            }
        } catch (err) {
            console.error('[SessionManager] Failed to subscribe to participant service:', err);
        }
    }

    /**
     * HOST: Broadcast the participant count periodically to all guests.
     */
    private startParticipantBroadcast() {
        const broadcastInterval = 60000; // 60 seconds
        this.broadcastIntervalId = setInterval(() => {
            const count = (this.liveShareApi.peers?.length || 0) + 1; // +1 for host
            console.log(`[SessionManager] Broadcasting participant count: ${count}`);

            if (this.participantService) {
                this.participantService.notify('participantUpdate', { count });
            }
        }, broadcastInterval);
    }

    /**
     * Cleanup resources (clear intervals, nullify services) when session ends or extension deactivates.
     */
    public dispose() {
        if (this.broadcastIntervalId) {
            clearInterval(this.broadcastIntervalId as any);
            this.broadcastIntervalId = null;
        }
        this.participantService = null;
        console.log('[SessionManager] Cleaned up session resources.');
    }

    // sessionManager.ts
    public broadcastParticipantCount(count: number) {
        if (this.participantService) {
            this.participantService.notify('participantUpdate', { count });
        }
    }

}