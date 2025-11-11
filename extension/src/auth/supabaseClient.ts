import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as vscode from 'vscode';
import { globalContext } from '../extension';

let client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client with VS Code globalState storage.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = (
    vscode.workspace.getConfiguration().get<string>('collabAgent.supabase.url') ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();

  const anonKey = (
    vscode.workspace.getConfiguration().get<string>('collabAgent.supabase.anonKey') ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  if (!url || !anonKey) {
    throw new Error(
      'Supabase not configured. Set collabAgent.supabase.url & collabAgent.supabase.anonKey in Settings or export SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_KEY environment variables.'
    );
  }

  /**
   * Supabase requires synchronous storage functions.
   * We'll mirror VS Code globalState into a simple in-memory cache that persists to globalState.
   */
  const memoryStorage: Record<string, string> = {};

  const storage = {
    getItem(key: string) {
      if (memoryStorage[key]) return memoryStorage[key];
      const val = globalContext?.globalState.get<string>(key) ?? null;
      if (val) memoryStorage[key] = val;
      return val;
    },
    setItem(key: string, value: string) {
      memoryStorage[key] = value;
      globalContext?.globalState.update(key, value);
    },
    removeItem(key: string) {
      delete memoryStorage[key];
      globalContext?.globalState.update(key, undefined);
    },
  };

  client = createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  console.log('[Supabase] Client created, checking for existing session...');
  client.auth.getSession().then(({ data, error }) => {
    if (error) console.error('[Supabase] Session fetch error:', error);
    console.log('[Supabase] Existing session found:', !!data.session);
  });

  return client;
}

/**
 * Retrieves the current authenticated user.
 */
export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) console.error('[getCurrentUser] error:', error.message);
  return data.user;
}