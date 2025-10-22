import { getSupabase } from '../auth/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SessionSyncService {
    private channel?: RealtimeChannel;
    private sessionId?: string;
    
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
    private handleParticipantChange(payload: any) {
        // We'll implement this next - it will update the UI
        console.log('[SessionSync] New/updated participant:', payload.new);
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
     * Leave the session
     */
    async leaveSession() {
        if (!this.sessionId) return;

        const supabase = getSupabase();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Mark as left
            await supabase
                .from('session_participants')
                .update({ left_at: new Date().toISOString() })
                .eq('session_id', this.sessionId)
                .eq('user_id', user.id);

            // Unsubscribe
            if (this.channel) {
                await this.channel.unsubscribe();
                this.channel = undefined;
            }

            console.log('[SessionSync] Left session');
        } catch (err) {
            console.error('[SessionSync] Error leaving session:', err);
        }
    }
}