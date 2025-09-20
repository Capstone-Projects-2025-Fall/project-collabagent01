import * as vscode from "vscode";
import {
  resetDebounceTimeout,
  setLastRequest,
  setDebounceTimeout,
} from "../services/suggestion-service";
import { getAuthContext } from "../services/auth-service";
import { errorNotification, authNotification } from "../views/notifications";

/**
 * Registers the inline completion provider for AI-generated code suggestions.
 *
 * This provider listens for typing events and supplies real-time code completions.
 */
export const inlineCompletionProvider =
  vscode.languages.registerInlineCompletionItemProvider(
    { scheme: "file" },
    {
      provideInlineCompletionItems,
    }
  );

/**
 * Provides inline completion suggestions based on the user's current typing context.
 * @param {vscode.TextDocument} document - The active text document.
 * @param {vscode.Position} position - The current cursor position.
 * @param {vscode.InlineCompletionContext} context - The inline completion context.
 * @param {vscode.CancellationToken} token - A cancellation token.
 * @returns {Promise<vscode.InlineCompletionList | vscode.InlineCompletionItem[]>}
 * A list of inline completion items.
 */
export async function provideInlineCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.InlineCompletionContext,
  token: vscode.CancellationToken
): Promise<vscode.InlineCompletionList | vscode.InlineCompletionItem[]> {
  const { context: userContext, error } = await getAuthContext();

  if (error) {
    await errorNotification(`Failed to get user context: ${error}`);
    return [];
  }
  if (!userContext) {
    await authNotification();
    return [];
  }
  if (!userContext.settings.give_suggestions) {
    return [];
  }
  resetDebounceTimeout();

  // Store the latest request
  setLastRequest(document, position, context, token);
  // Wait for debounce to complete and return the suggestion
  return await new Promise((resolve) => setDebounceTimeout(resolve));
}
