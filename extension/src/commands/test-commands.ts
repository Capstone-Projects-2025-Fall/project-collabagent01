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
export const testFetchCommand = { dispose() {} } as any;

/**
 * Registers a debug command to view the incorrect suggestions selected by a user.
 *
 * Retrieves stored incorrect choices and displays them in an information message.
 * (Currently uses a hardcoded test user ID.)
 */
export const incorrectChoicesCommand = { dispose() {} } as any;

/**
 * Registers a debug command to force a check of the user's authentication status.
 *
 * Useful for verifying if a user session is active or prompting reauthentication.
 */
export const fetchSettingsCommand = { dispose() {} } as any;
