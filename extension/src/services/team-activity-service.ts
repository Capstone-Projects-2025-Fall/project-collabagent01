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
