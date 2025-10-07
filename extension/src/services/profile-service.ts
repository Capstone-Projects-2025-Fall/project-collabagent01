import * as vscode from 'vscode';
import { getSupabase } from '../auth/supabaseClient';
import { globalContext } from '../extension';

/** Global state key for storing user's display name */
const DISPLAY_NAME_KEY = 'collabAgent.displayName';

/**
 * Result object containing display name and its source.
 */
export interface DisplayNameResult {
  /** The display name to use */
  displayName: string;
  /** Where the display name was obtained from */
  source: 'supabase' | 'cached' | 'prompt' | 'fallback';
}

/**
 * Gets or initializes a display name for the user.
 * Tries multiple sources: cached, Supabase metadata, user prompt, or fallback.
 * 
 * @param nonInteractive - If true, won't prompt user for input
 * @returns Promise resolving to display name result with source
 */
export async function getOrInitDisplayName(nonInteractive = false): Promise<DisplayNameResult> {
  // 1. If cached in globalState, return it.
  const cached = globalContext?.globalState.get<string>(DISPLAY_NAME_KEY);
  if (cached) {
    return { displayName: cached, source: 'cached' };
  }
  // 2. Try Supabase auth user metadata.
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (user?.user_metadata) {
      const meta = user.user_metadata as any;
      const candidate = meta.user_name || meta.preferred_username || meta.full_name || meta.name || user.email || undefined;
      if (candidate) {
        await globalContext.globalState.update(DISPLAY_NAME_KEY, candidate);
        return { displayName: candidate, source: 'supabase' };
      }
    }
  } catch (e) {
    console.warn('Display name: Supabase metadata fetch failed', e);
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
