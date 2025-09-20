import * as vscode from "vscode";
import {
  logLineSuggestionEvent,
  logSuggestionEvent,
} from "../services/log-service";
import {
  SuggestionChoice,
  currentChoices,
  suggestionContext,
  isSuspended,
  resetSuggestionContext,
  handleBuggedSuggestionReview,
  handleIncorrectSuggestionSelection,
} from "../services/suggestion-service";
import { getAuthContext } from "../services/auth-service";
import { resetIntervenedCache } from "../api/suggestion-api";

/**
 * Registers suggestion-related commands and returns their disposables.
 *
 * Commits the inline suggestion into the editor, logs the acceptance event,
 * and handles review if the suggestion contains a known bug.
 */
export function registerSuggestionCommands(): vscode.Disposable[] {
  const accept = vscode.commands.registerCommand(
    "collabAgent.acceptInlineSuggestion",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      if (isSuspended) {
        vscode.window.showInformationMessage(
          "Please hover over the suggestions and select the correct one manually",
          { modal: false }
        );
        return;
      }

      const { context } = await getAuthContext();
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.commit"
      );

      if (context?.settings.intervened) {
        logLineSuggestionEvent(true, suggestionContext);
        resetSuggestionContext();
        return;
      } else {
        logSuggestionEvent(true, suggestionContext);

        if (suggestionContext.hasBug) {
          await handleBuggedSuggestionReview(suggestionContext);
        }

        resetSuggestionContext();
      }
    }
  );

  const reject = vscode.commands.registerCommand(
    "collabAgent.rejectInlineSuggestion",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const { context } = await getAuthContext();

      if (context?.settings.intervened) {
        logLineSuggestionEvent(false, suggestionContext);
        resetSuggestionContext();
        resetIntervenedCache();
      } else {
        await vscode.commands.executeCommand(
          "editor.action.inlineSuggest.hide"
        );
        await vscode.commands.executeCommand("hideSuggestWidget");

        logSuggestionEvent(false, suggestionContext);
        resetSuggestionContext();
      }
    }
  );

  const track = vscode.commands.registerCommand(
    "clover.suggestionSelected",
    async (choice: SuggestionChoice) => {
      logSuggestionEvent(choice.isCorrect, suggestionContext);

      if (!choice.isCorrect) {
        const rightCode = currentChoices.find((c) => c.isCorrect)?.text || "";
        await handleIncorrectSuggestionSelection(
          choice.text,
          rightCode,
          suggestionContext.prompt
        );
      }
    }
  );

  const onTypeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) {
      return;
    }

    const isIntervenedActive =
      (suggestionContext?.intervenedSuggestions?.length ?? 0) > 0;

    if (!isIntervenedActive) {
      return;
    }

    const isUserTyping = event.contentChanges.some(
      (change) => change.text && !change.text.includes("\n")
    );

    if (isUserTyping) {
      console.log(
        "✏️ User typed during intervened suggestion — resetting cache"
      );
      resetIntervenedCache();
      resetSuggestionContext();
    }
  });

  return [accept, reject, track, onTypeListener];
}
