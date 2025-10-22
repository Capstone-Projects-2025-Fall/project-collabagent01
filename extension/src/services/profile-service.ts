import * as vscode from 'vscode';
import { getSupabase } from '../auth/supabaseClient';
import { globalContext } from '../extension';

//storing user's display name
const DISPLAY_NAME_KEY = 'collabAgent.displayName';


//Result object containing display name and its source.
export interface DisplayNameResult {
  displayName: string;
  source: 'supabase' | 'cached' | 'prompt' | 'fallback';
}

/**
 * Gets or initializes a display name for the user.
 * Tries multiple sources: cached, Supabase metadata, user prompt, or fallback.
 * 
 * @param nonInteractive - If true, won't prompt user for input
 * @returns
 */

export async function getOrInitDisplayName(nonInteractive = false): Promise<DisplayNameResult> {
  // Debug logging 
  console.log('[getOrInitDisplayName] Starting...');
  console.log('[getOrInitDisplayName] SUPABASE_URL:', process.env.SUPABASE_URL ? 'LOADED' : 'NOT FOUND');
  console.log('[getOrInitDisplayName] SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'LOADED' : 'NOT FOUND');

  // 1. If cached in globalState, return it.
  const cached = globalContext?.globalState.get<string>(DISPLAY_NAME_KEY);
  if (cached) {
    return { displayName: cached, source: 'cached' };
  }
  // 2. Try Supabase auth user metadata.
  try {
    console.log('[getOrInitDisplayName] Attempting to get Supabase client...');
    const supabase = getSupabase();
    console.log('[getOrInitDisplayName] Supabase client obtained.');
    console.log('[getOrInitDisplayName] Getting user...');
    const { data, error } = await supabase.auth.getUser();
    console.log('[getOrInitDisplayName] getUser result - data:', !!data, 'error:', error);
    const user = data?.user;
    console.log('[getOrInitDisplayName] User exists:', !!user);
    if (user?.user_metadata) {
      const meta = user.user_metadata as any;
      console.log('[getOrInitDisplayName] User metadata keys:', Object.keys(meta));
      const candidate = meta.user_name || meta.preferred_username || meta.full_name || meta.name || user.email || undefined;
      if (candidate) {
        console.log('[getOrInitDisplayName] Found name from Supabase:', candidate);
        await globalContext.globalState.update(DISPLAY_NAME_KEY, candidate);
        return { displayName: candidate, source: 'supabase' };
      } else {
        console.log('[getOrInitDisplayName] No suitable name found in user metadata.');
      }
    } else {
      console.log('[getOrInitDisplayName] No user metadata available.');
    }
  } catch (e) {
    console.error('[getOrInitDisplayName] Error fetching user from Supabase:', e);
  }
  // 3. Optionally prompt user (unless nonInteractive)
  if (!nonInteractive) {
    const input = await vscode.window.showInputBox({
      title: 'Set Display Name',
      prompt: 'Enter the name to show to others in Live Share sessions',
      ignoreFocusOut: true,
      validateInput: (val) => !val.trim() ? 'Display name cannot be empty' : undefined
    });
    if (input && input.trim()) {
      await globalContext.globalState.update(DISPLAY_NAME_KEY, input.trim());
      return { displayName: input.trim(), source: 'prompt' };
    }
  }
  // 4. Final fallback.
  return { displayName: 'You', source: 'fallback' };
}

/**
 * Allows user to explicitly set or change their display name.
 * Shows input dialog with current name pre-filled.
 */
export async function setDisplayNameExplicit(): Promise<void> {
  const current = globalContext.globalState.get<string>(DISPLAY_NAME_KEY) || '';
  const input = await vscode.window.showInputBox({
    title: 'Change Display Name',
    value: current,
    prompt: 'Enter a new display name for Live Share sessions',
    ignoreFocusOut: true,
    validateInput: (val) => !val.trim() ? 'Display name cannot be empty' : undefined
  });
  if (input && input.trim()) {
    await globalContext.globalState.update(DISPLAY_NAME_KEY, input.trim());
    vscode.window.showInformationMessage(`Collab Agent: Display name updated to "${input.trim()}"`);
  }
}

/**
 * Gets the cached display name from global state.
 * 
 * @returns The cached display name or undefined if not set
 */
export function getCachedDisplayName(): string | undefined {
  return globalContext?.globalState.get<string>(DISPLAY_NAME_KEY);
}
