import * as vscode from 'vscode';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';

export class PresenceService {
    private userId: string | null = null;
    private teamId: string | null = null;
    private displayName: string | null = null;
    private currentStatus: 'active' | 'idle' | 'busy' | 'offline' = 'active';
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(private context: vscode.ExtensionContext) {}

    public initialize(userId: string, teamId: string, displayName: string) {
        this.userId = userId;
        this.teamId = teamId;
        this.displayName = displayName;
        this.currentStatus = 'active';
        
        this.startHeartbeat();
        console.log('[PresenceService] Initialized');
    }

    public async setStatus(status: 'active' | 'idle' | 'busy' | 'offline') {
        this.currentStatus = status;
        await this.updatePresence();
    }

    public getCurrentStatus(): string {
        return this.currentStatus;
    }

    public async fetchTeamPresence(): Promise<any[]> {
        if (!this.teamId) return [];
        
        try {
            const response = await fetch(`${BASE_URL}/api/ai/presence?team_id=${this.teamId}`);
            if (!response.ok) throw new Error('Failed');
            return await response.json();
        } catch (error) {
            console.error('[PresenceService] Error:', error);
            return [];
        }
    }

    private async updatePresence() {
        if (!this.userId || !this.teamId) return;

        try {
            await fetch(`${BASE_URL}/api/ai/presence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.userId,
                    team_id: this.teamId,
                    status: this.currentStatus,
                    display_name: this.displayName
                })
            });
        } catch (error) {
            console.error('[PresenceService] Update error:', error);
        }
    }

    private startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => this.updatePresence(), 60000);
        this.updatePresence();
    }

    public dispose() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    }
}
