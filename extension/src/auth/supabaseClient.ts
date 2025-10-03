import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as vscode from 'vscode';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  // Read directly by full key (safer if user put in settings.json manually)
  const url = (vscode.workspace.getConfiguration().get<string>('collabAgent.supabase.url')
    || process.env.SUPABASE_URL
    || '').trim();
  const anonKey = (
    vscode.workspace.getConfiguration().get<string>('collabAgent.supabase.anonKey')
    || process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_KEY // common name used in backend .env
    || ''
  ).trim();

  if (!url || !anonKey) {
    throw new Error('Supabase not configured. Set collabAgent.supabase.url & collabAgent.supabase.anonKey in Settings or export SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_KEY) environment variables.');
  }
  client = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
