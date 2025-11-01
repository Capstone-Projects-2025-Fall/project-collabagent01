import * as vscode from 'vscode';
import { RealtimeChannel } from '@supabase/supabase-js';

// Presence-related types
export interface UserPresence {
    id: string;
    user_id: string;
    team_id: string;
    status: 'online' | 'away' | 'offline';
    last_heartbeat: string;
    current_file?: string;
    current_activity?: string;
    created_at: string;
    updated_at: string;
}

export interface OnlineTeamMember {
    user_id: string;
    status: 'online' | 'away' | 'offline';
    last_heartbeat: string;
    current_file?: string;
    current_activity?: string;
    github_username?: string;
    avatar_url?: string;
}

export interface PresenceChangeEvent {
    type: 'member_online' | 'member_offline' | 'member_away';
    member: OnlineTeamMember;
    teamId: string;
}

// Gets the shared Supabase client instance
async function getSupabaseClient() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSupabase } = require('../auth/supabaseClient');
        return getSupabase();
    } catch (error) {
        throw new Error(`Failed to initialize Supabase client: ${error}`);
    }
}

// Get current user ID from auth context
async function getCurrentUserId(): Promise<string | null> {
    const { getAuthContext } = require('./auth-service');
    const auth = await getAuthContext();
    return auth?.user?.id || null;
}

/**
 * PresenceService manages real-time user presence tracking for teams
 * Handles heartbeat updates, online status monitoring, and presence notifications
 */
export class PresenceService {
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private presenceChannel: RealtimeChannel | null = null;
    private currentTeamId: string | null = null;
    private onlineMembers: Map<string, OnlineTeamMember> = new Map();
    private presenceChangeCallbacks: ((event: PresenceChangeEvent) => void)[] = [];
    private readonly HEARTBEAT_INTERVAL_MS = 45000; // 45 seconds
    private readonly HEARTBEAT_TIMEOUT_MS = 90000; // 90 seconds - matches DB query
    private isActive: boolean = false;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Start presence tracking for a team
     */
    async startPresence(teamId: string): Promise<void> {
        if (this.isActive && this.currentTeamId === teamId) {
            console.log(`Presence already active for team ${teamId}`);
            return;
        }

        // Stop existing presence if switching teams
        if (this.isActive) {
            await this.stopPresence();
        }

        console.log(`Starting presence for team ${teamId}`);
        this.currentTeamId = teamId;
        this.isActive = true;

        // Send initial heartbeat
        await this.sendHeartbeat('online');

        // Start periodic heartbeat
        this.heartbeatInterval = setInterval(async () => {
            await this.sendHeartbeat('online');
        }, this.HEARTBEAT_INTERVAL_MS);

        // Subscribe to presence changes
        await this.subscribeToPresenceChanges(teamId);

        // Fetch initial online members
        await this.fetchOnlineMembers();
    }

    /**
     * Stop presence tracking
     */
    async stopPresence(): Promise<void> {
        if (!this.isActive) {
            return;
        }

        console.log('Stopping presence tracking');
        this.isActive = false;

        // Clear heartbeat interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // Unsubscribe from presence channel
        if (this.presenceChannel) {
            const supabase = await getSupabaseClient();
            await supabase.removeChannel(this.presenceChannel);
            this.presenceChannel = null;
        }

        // Set status to offline
        if (this.currentTeamId) {
            await this.setOffline();
        }

        this.currentTeamId = null;
        this.onlineMembers.clear();
    }

    /**
     * Send heartbeat to update presence
     */
    private async sendHeartbeat(status: 'online' | 'away' = 'online'): Promise<void> {
        if (!this.currentTeamId) {
            return;
        }

        try {
            const supabase = await getSupabaseClient();
            const activeEditor = vscode.window.activeTextEditor;
            const currentFile = activeEditor?.document.uri.fsPath;

            // Get current activity from status bar or last command
            const currentActivity = this.getCurrentActivity();

            const { data, error } = await supabase.rpc('update_presence_heartbeat', {
                p_team_id: this.currentTeamId,
                p_status: status,
                p_current_file: currentFile,
                p_current_activity: currentActivity
            });

            if (error) {
                console.error('Failed to send heartbeat:', error);
            }
        } catch (error) {
            console.error('Error sending heartbeat:', error);
        }
    }

    /**
     * Set user status to offline
     */
    private async setOffline(): Promise<void> {
        if (!this.currentTeamId) {
            return;
        }

        try {
            const supabase = await getSupabaseClient();
            const { error } = await supabase.rpc('set_presence_offline', {
                p_team_id: this.currentTeamId
            });

            if (error) {
                console.error('Failed to set offline status:', error);
            }
        } catch (error) {
            console.error('Error setting offline status:', error);
        }
    }

    /**
     * Fetch current online team members
     */
    async fetchOnlineMembers(): Promise<OnlineTeamMember[]> {
        if (!this.currentTeamId) {
            return [];
        }

        try {
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase.rpc('get_online_team_members', {
                p_team_id: this.currentTeamId
            });

            if (error) {
                console.error('Failed to fetch online members:', error);
                return [];
            }

            const members = (data || []) as OnlineTeamMember[];

            // Update local cache and detect new online members
            const previousMembers = new Set(this.onlineMembers.keys());
            const newOnlineMembers: OnlineTeamMember[] = [];

            members.forEach(member => {
                if (!previousMembers.has(member.user_id)) {
                    newOnlineMembers.push(member);
                }
                this.onlineMembers.set(member.user_id, member);
            });

            // Detect members who went offline
            previousMembers.forEach(userId => {
                if (!members.find(m => m.user_id === userId)) {
                    const offlineMember = this.onlineMembers.get(userId);
                    if (offlineMember) {
                        this.notifyPresenceChange({
                            type: 'member_offline',
                            member: offlineMember,
                            teamId: this.currentTeamId!
                        });
                    }
                    this.onlineMembers.delete(userId);
                }
            });

            // Notify about new online members
            newOnlineMembers.forEach(member => {
                this.notifyPresenceChange({
                    type: 'member_online',
                    member,
                    teamId: this.currentTeamId!
                });
            });

            return members;
        } catch (error) {
            console.error('Error fetching online members:', error);
            return [];
        }
    }

    /**
     * Subscribe to real-time presence changes
     */
    private async subscribeToPresenceChanges(teamId: string): Promise<void> {
        try {
            const supabase = await getSupabaseClient();
            const userId = await getCurrentUserId();

            if (!userId) {
                console.error('Cannot subscribe to presence: user not authenticated');
                return;
            }

            // Subscribe to presence changes for this team
            this.presenceChannel = supabase
                .channel(`presence_${teamId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_presence',
                        filter: `team_id=eq.${teamId}`
                    },
                    async (payload) => {
                        console.log('Presence change:', payload);

                        // Ignore our own changes
                        if (payload.new && (payload.new as any).user_id === userId) {
                            return;
                        }

                        // Refresh online members list
                        await this.fetchOnlineMembers();
                    }
                )
                .subscribe();

            console.log(`Subscribed to presence changes for team ${teamId}`);
        } catch (error) {
            console.error('Error subscribing to presence changes:', error);
        }
    }

    /**
     * Register a callback for presence change events
     */
    onPresenceChange(callback: (event: PresenceChangeEvent) => void): vscode.Disposable {
        this.presenceChangeCallbacks.push(callback);

        return new vscode.Disposable(() => {
            const index = this.presenceChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.presenceChangeCallbacks.splice(index, 1);
            }
        });
    }

    /**
     * Notify all callbacks about presence change
     */
    private notifyPresenceChange(event: PresenceChangeEvent): void {
        this.presenceChangeCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in presence change callback:', error);
            }
        });
    }

    /**
     * Get currently online team members
     */
    getOnlineMembers(): OnlineTeamMember[] {
        return Array.from(this.onlineMembers.values());
    }

    /**
     * Check if a specific user is online
     */
    isUserOnline(userId: string): boolean {
        return this.onlineMembers.has(userId);
    }

    /**
     * Get current activity description
     */
    private getCurrentActivity(): string | undefined {
        // You can extend this to track what the user is doing
        // For now, just return a simple status
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const fileName = activeEditor.document.fileName.split(/[\\/]/).pop();
            return `Editing ${fileName}`;
        }
        return 'Active in VS Code';
    }

    /**
     * Update current activity manually
     */
    async updateActivity(activity: string): Promise<void> {
        if (!this.currentTeamId || !this.isActive) {
            return;
        }

        await this.sendHeartbeat('online');
    }

    /**
     * Check if notification was shown recently
     */
    async wasNotificationShownRecently(
        teamId: string,
        notifiedAboutUserId: string,
        notificationType: 'came_online' | 'join_liveshare'
    ): Promise<boolean> {
        try {
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase.rpc('was_notification_shown_recently', {
                p_team_id: teamId,
                p_notified_about_user_id: notifiedAboutUserId,
                p_notification_type: notificationType
            });

            if (error) {
                console.error('Failed to check notification status:', error);
                return false;
            }

            return data === true;
        } catch (error) {
            console.error('Error checking notification status:', error);
            return false;
        }
    }

    /**
     * Record that a notification was shown
     */
    async recordNotificationShown(
        teamId: string,
        notifiedAboutUserId: string,
        notificationType: 'came_online' | 'join_liveshare'
    ): Promise<void> {
        try {
            const supabase = await getSupabaseClient();
            const { error } = await supabase.rpc('record_notification_shown', {
                p_team_id: teamId,
                p_notified_about_user_id: notifiedAboutUserId,
                p_notification_type: notificationType
            });

            if (error) {
                console.error('Failed to record notification:', error);
            }
        } catch (error) {
            console.error('Error recording notification:', error);
        }
    }

    /**
     * Dispose of the service
     */
    dispose(): void {
        this.stopPresence();
    }
}

// Singleton instance
let presenceServiceInstance: PresenceService | null = null;

/**
 * Get or create the PresenceService singleton
 */
export function getPresenceService(context: vscode.ExtensionContext): PresenceService {
    if (!presenceServiceInstance) {
        presenceServiceInstance = new PresenceService(context);
    }
    return presenceServiceInstance;
}

/**
 * Initialize presence service for current team
 */
export async function initializePresenceForTeam(
    context: vscode.ExtensionContext,
    teamId: string
): Promise<void> {
    const service = getPresenceService(context);
    await service.startPresence(teamId);
}

/**
 * Stop presence tracking
 */
export async function stopPresenceTracking(): Promise<void> {
    if (presenceServiceInstance) {
        await presenceServiceInstance.stopPresence();
    }
}
