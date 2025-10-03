import * as vscode from 'vscode';
import { getSupabase } from '../auth/supabaseClient';
import { globalContext } from '../extension';

const DISPLAY_NAME_KEY = 'collabAgent.displayName';

export interface DisplayNameResult {
  displayName: string;
  source: 'supabase' | 'cached' | 'prompt' | 'fallback';
}

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

export function getCachedDisplayName(): string | undefined {
  return globalContext?.globalState.get<string>(DISPLAY_NAME_KEY);
}
