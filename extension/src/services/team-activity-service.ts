import { BASE_URL } from '../api/types/endpoints';

export interface ActivityItem {
  id: string;
  team_id: string;
  user_id: string;
  summary: string;
  file_path?: string;
  source_snapshot_id?: string;
  activity_type?: string;
  created_at?: string;
}

export async function fetchTeamActivity(teamId: string, limit = 25): Promise<{ success: boolean; items?: ActivityItem[]; error?: string }>{
  try {
    const url = new URL(`${BASE_URL}/api/ai/feed`);
    url.searchParams.set('team_id', teamId);
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${txt}` };
    }
    const data = await res.json();
    return { success: true, items: Array.isArray(data) ? data : [] };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Inserts a Live Share session event into the team activity feed via backend API
 * @param teamId - The team ID
 * @param userId - The user ID who started/joined the session
 * @param eventType - Type of event: 'live_share_started' | 'live_share_joined'
 * @param displayName - The display name of the user
 * @param sessionId - Optional session ID for reference
 * @returns Promise with success status
 */
export async function insertLiveShareActivity(
  teamId: string,
  userId: string,
  eventType: 'live_share_started' | 'live_share_joined',
  displayName: string,
  sessionId?: string
): Promise<{ success: boolean; error?: string; summary?: string }> {
  try {
    const url = new URL(`${BASE_URL}/api/ai/live_share_event`);

    const payload = {
      event_type: eventType === 'live_share_started' ? 'started' : 'joined',
      session_id: sessionId,
      team_id: teamId,
      user_id: userId,
      display_name: displayName
    };

    console.log('[TeamActivityService] Sending Live Share event to backend:', payload);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[TeamActivityService] Error from backend:', txt);
      return { success: false, error: `HTTP ${res.status}: ${txt}` };
    }

    const data = await res.json();
    console.log('[TeamActivityService] Live Share activity inserted:', data);
    return { success: true, summary: data.summary };
  } catch (err: any) {
    console.error('[TeamActivityService] Exception inserting Live Share activity:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Inserts a Live Share session end event with participant details via backend API
 * @param teamId - The team ID
 * @param userId - The user ID who hosted the session
 * @param displayName - The display name of the host
 * @param sessionId - The session ID
 * @param durationMinutes - Duration of the session in minutes
 * @param snapshotId - Optional snapshot ID containing git diff
 * @returns Promise with success status
 */
export async function insertLiveShareSessionEnd(
  teamId: string,
  userId: string,
  displayName: string,
  sessionId: string,
  durationMinutes: number,
  snapshotId?: string
): Promise<{ success: boolean; error?: string; summary?: string }> {
  try {
    const url = new URL(`${BASE_URL}/api/ai/live_share_event`);

    const payload = {
      event_type: 'ended',
      session_id: sessionId,
      team_id: teamId,
      user_id: userId,
      display_name: displayName,
      duration_minutes: durationMinutes,
      snapshot_id: snapshotId  // Link to file_snapshots row with git diff
    };

    console.log('[TeamActivityService] Sending Live Share session end to backend:', payload);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[TeamActivityService] Error from backend:', txt);
      return { success: false, error: `HTTP ${res.status}: ${txt}` };
    }

    const data = await res.json();
    console.log('[TeamActivityService] Live Share session end inserted:', data);
    return { success: true, summary: data.summary };
  } catch (err: any) {
    console.error('[TeamActivityService] Exception inserting Live Share session end:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Inserts a Live Share summary with git diff changes via backend API
 * @param teamId - The team ID
 * @param userId - The user ID who hosted the session
 * @param displayName - The display name of the host
 * @param sessionId - The session ID
 * @param changes - Git diff output
 * @returns Promise with success status and snapshot ID
 */
export async function insertLiveShareSummary(
  teamId: string,
  userId: string,
  displayName: string,
  sessionId: string,
  changes: string
): Promise<{ success: boolean; error?: string; snapshotId?: string }> {
  try {
    const url = new URL(`${BASE_URL}/api/ai/live_share_summary`);

    const payload = {
      session_id: sessionId,
      team_id: teamId,
      user_id: userId,
      display_name: displayName,
      changes: changes
    };

    console.log('[TeamActivityService] Sending Live Share summary to backend');

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('[TeamActivityService] Error from backend:', txt);
      return { success: false, error: `HTTP ${res.status}: ${txt}` };
    }

    const data = await res.json();
    console.log('[TeamActivityService] Live Share summary inserted:', data);
    return { success: true, snapshotId: data.snapshot_id };
  } catch (err: any) {
    console.error('[TeamActivityService] Exception inserting Live Share summary:', err);
    return { success: false, error: err?.message || String(err) };
  }
}
