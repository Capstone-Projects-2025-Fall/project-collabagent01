import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as vscode from 'vscode';
import { globalContext } from '../extension';

/** Singleton Supabase client instance */
let client: SupabaseClient | null = null;

/**
 * Gets or creates a Supabase client instance.
 * Reads configuration from VS Code settings or environment variables.
 *
 * @returns The Supabase client instance
 * @throws Error if Supabase configuration is missing
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = (vscode.workspace.getConfiguration().get<string>('collabAgent.supabase.url')
    || process.env.SUPABASE_URL
    || '').trim();
  
  const anonKey = (
    vscode.workspace.getConfiguration().get<string>('collabAgent.supabase.anonKey')
    || process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_KEY
    || ''
  ).trim();

  if (!url || !anonKey) {
    throw new Error('Supabase not configured. Set collabAgent.supabase.url & collabAgent.supabase.anonKey in Settings or export SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_KEY) environment variables.');
  }

  // Create client with custom storage that uses VS Code globalState
  client = createClient(url, anonKey, {
    auth: {
      storage: {
        getItem: async (key: string) => {
          return globalContext?.globalState.get(key) || null;
        },
        setItem: async (key: string, value: string) => {
          await globalContext?.globalState.update(key, value);
        },
        removeItem: async (key: string) => {
          await globalContext?.globalState.update(key, undefined);
        }
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  
  console.log('[Supabase] Client created, checking for existing session...');
  client.auth.getSession().then(({ data }) => {
    console.log('[Supabase] Existing session found:', !!data.session);
  });

  return client;
}

/**
 * Gets the currently authenticated user from Supabase.
 *
 * @returns Promise resolving to the current user or null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user;
}