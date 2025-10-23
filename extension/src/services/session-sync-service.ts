import { getSupabase } from '../auth/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SessionSyncService {
    private channel?: RealtimeChannel;
    private sessionId?: string;
    private onParticipantChangeCallback?: (participants: any[]) => void;
    
    /**
     * Join a session and announce your presence
     */
    async joinSession(sessionId: string, githubUsername: string, peerNumber: number) {
        const supabase = getSupabase();
        this.sessionId = sessionId;
        
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('[SessionSync] No authenticated user');
                return;
            }

            // Insert/update participant record
            const { error } = await supabase
                .from('session_participants')
                .upsert({
                    session_id: sessionId,
                    user_id: user.id,
                    github_username: githubUsername,
                    peer_number: peerNumber,
                    joined_at: new Date().toISOString(),
                    left_at: null
                }, { 
                    onConflict: 'session_id,peer_number'
                });
        

            if (error) {
                console.error('[SessionSync] Failed to announce presence:', error);
                return;
            }

            console.log('[SessionSync] Successfully announced presence:', githubUsername);

            // Subscribe to changes
            this.subscribeToSession(sessionId);
        } catch (err) {
            console.error('[SessionSync] Error joining session:', err);
        }
    }

    /**
     * Subscribe to participant changes for this session
     */
    private subscribeToSession(sessionId: string) {
        const supabase = getSupabase();

        this.channel = supabase
            .channel(`session_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'session_participants',
                    filter: `session_id=eq.${sessionId}`
                },
                (payload) => {
                    console.log('[SessionSync] Participant change:', payload);
                    this.handleParticipantChange(payload);
                }
            )
            .subscribe((status) => {
                console.log('[SessionSync] Subscription status:', status);
            });
    }

    /**
     * Handle participant changes from Supabase
     */
    private async handleParticipantChange(payload: any) {
        console.log('[SessionSync] New/updated participant:', payload.new);
        
        // Reload all participants and notify callback
        if (this.sessionId && this.onParticipantChangeCallback) {
            const participants = await this.getParticipants(this.sessionId);
            this.onParticipantChangeCallback(participants);
        }
    }

    /**
     * Set callback for participant changes
     */
    setOnParticipantChange(callback: (participants: any[]) => void) {
        this.onParticipantChangeCallback = callback;
    }

    /**
     * Get all current participants in the session
     */
    async getParticipants(sessionId: string): Promise<any[]> {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .is('left_at', null)
            .order('joined_at', { ascending: true });

        if (error) {
            console.error('[SessionSync] Failed to get participants:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Leave the session - deletes the participant record
     */
    async leaveSession() {
        if (!this.sessionId) return;

        const supabase = getSupabase();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Delete the participant record
            const { error } = await supabase
                .from('session_participants')
                .delete()
                .eq('session_id', this.sessionId)
                .eq('user_id', user.id);

            if (error) {
                console.error('[SessionSync] Error deleting participant record:', error);
            } else {
                console.log('[SessionSync] Successfully left session and removed from participants');
            }

            // Unsubscribe
            if (this.channel) {
                await this.channel.unsubscribe();
                this.channel = undefined;
            }
        } catch (err) {
            console.error('[SessionSync] Error leaving session:', err);
        }
    }

    /**
     * Cleanup all participants for a session (host ending session)
     */
    async cleanupSession(sessionId: string) {
        const supabase = getSupabase();

        try {
            const { error } = await supabase
                .from('session_participants')
                .delete()
                .eq('session_id', sessionId);

            if (error) {
                console.error('[SessionSync] Error cleaning up session:', error);
            } else {
                console.log('[SessionSync] Successfully cleaned up all participants for session:', sessionId);
            }

            // Unsubscribe if this was our session
            if (this.sessionId === sessionId && this.channel) {
                await this.channel.unsubscribe();
                this.channel = undefined;
            }
        } catch (err) {
            console.error('[SessionSync] Error cleaning up session:', err);
        }
    }
}
