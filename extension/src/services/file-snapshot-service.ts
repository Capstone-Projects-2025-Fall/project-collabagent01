import * as vscode from 'vscode';
import { getAuthContext } from './auth-service';
import { BASE_URL } from '../api/types/endpoints';

/** Shape for snapshot data coming from the webview */
export interface FileSnapshotInput {
  id?: string; // optional; if not provided, DB/default can generate or we generate here
  user_id?: string; // optional; can be resolved via auth context
  team_id?: string; // optional; should be passed from UI (active team)
  file_path: string;
  snapshot: string;
  changes: string;
  updated_at?: string; // ISO string
}

async function getSupabaseClient() {
  // Lazy require to avoid ESM type resolution issues at compile time
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js');
  const config = vscode.workspace.getConfiguration('collabAgent');
  const supabaseUrl = config.get<string>('supabase.url');
  const supabaseKey = config.get<string>('supabase.anonKey');
  const serviceRoleKey = config.get<string>('supabase.serviceRoleKey');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing. Configure collabAgent.supabase.url and anonKey.');
  }
  const keyToUse = serviceRoleKey || supabaseKey;
  return createClient(supabaseUrl, keyToUse);
}

/**
 * Inserts a new row into file_snapshots.
 * Resolves the Supabase auth user id from the current user context when necessary.
 */
export async function addFileSnapshot(input: FileSnapshotInput): Promise<{ success: boolean; id?: string; error?: string }>{
  try {
    const supabase = await getSupabaseClient();

    // Resolve auth user id using email mapping (consistent with team-service)
    let authUserId: string | undefined = input.user_id;
    if (!authUserId) {
      const { context: user, error: authErr } = await getAuthContext();
      if (authErr || !user) {
        return { success: false, error: 'Not authenticated.' };
      }
      // Prefer mapping via admin.listUsers to match auth.users.id
      const { data: authUsers, error: adminErr } = await supabase.auth.admin.listUsers();
      if (adminErr) {
        return { success: false, error: `Failed to lookup auth users: ${adminErr.message}` };
      }
      const match = authUsers.users.find((u: any) => u.email === user.email);
      if (!match) {
        return { success: false, error: 'Could not resolve Supabase auth user id from current user.' };
      }
      authUserId = match.id;
    }

    if (!input.team_id) {
      // Attempt to infer team from global state used by AgentPanel
      // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { globalContext } = require('../extension');
  const currentTeamId = globalContext?.globalState.get('collabAgent.currentTeam') as string | undefined;
      if (!currentTeamId) {
        return { success: false, error: 'Active team is not selected.' };
      }
      input.team_id = currentTeamId;
    }

    const row = {
      id: input.id || cryptoRandomUUIDFallback(),
      user_id: authUserId,
      team_id: input.team_id,
      file_path: input.file_path,
      snapshot: input.snapshot,
      changes: input.changes,
      updated_at: input.updated_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('file_snapshots')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// generateTeamActivityFromSnapshot function removed - edge function now handles automatic summarization

function cryptoRandomUUIDFallback(): string {
  // Use the Node 18+ crypto.randomUUID if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  // Fallback simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const __test = {
  cryptoRandomUUIDFallback,
};