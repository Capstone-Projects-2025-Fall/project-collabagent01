import * as vscode from "vscode";
import { fetchSuggestions } from "../api/suggestion-api";
import { getIncorrectChoices } from "../services/incorrect-tracker-service";
import { checkUserSignIn } from "../services/auth-service";

/**
 * Registers a debug command to manually test suggestion generation.
 *
 * Prompts the user for a custom input prompt, fetches AI suggestions,
 * and displays the results in an information message.
 */
export const testFetchCommand = vscode.commands.registerCommand(
  "collabAgent.testFetch",
  async () => {
    const userInput = await vscode.window.showInputBox({
      prompt: "Enter prompt for suggestion.",
    });

    if (userInput) {
      try {
        const { suggestions, error } = await fetchSuggestions(userInput);

        if (error) {
          vscode.window.showErrorMessage(`Error: ${error}`);
          return;
        }

        if (!suggestions) {
          vscode.window.showErrorMessage("No suggestions received.");
          return;
        }

        vscode.window.showInformationMessage(
          `Suggestions: ${suggestions.join(", ")}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error}`);
      }
    }
  }
);

/**
 * Registers a debug command to view the incorrect suggestions selected by a user.
 *
 * Retrieves stored incorrect choices and displays them in an information message.
 * (Currently uses a hardcoded test user ID.)
 */
export const incorrectChoicesCommand = vscode.commands.registerCommand(
  "clover.viewIncorrectChoices",
  async () => {
    const userId = "12345";
    const incorrectChoices = getIncorrectChoices(userId);

    if (incorrectChoices.length === 0) {
      vscode.window.showInformationMessage(
        "User does has not chosen an incorrect code suggestion."
      );
    } else {
      vscode.window.showInformationMessage(
        `Incorrect Choices:\n${incorrectChoices
          .map((choice) => `- ${choice.suggestion}`)
          .join("\n")}`
      );
    }
  }
);

/**
 * Registers a debug command to force a check of the user's authentication status.
 *
 * Useful for verifying if a user session is active or prompting reauthentication.
 */
export const fetchSettingsCommand = vscode.commands.registerCommand(
  "collabAgent.fetchSettings",
  async () => {
    await checkUserSignIn();
  }
);
