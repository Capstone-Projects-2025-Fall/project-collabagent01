import * as vscode from "vscode";
import { getAuthContext } from "../services/auth-service";
import {
  signInMenu,
  handleSignUp,
  handleSignOut,
} from "../services/auth-service";

const showErrors = true;

/**
 * Displays an error notification to the user in VS Code.
 *
 * Logs the error to the console and, if enabled, shows a non-modal error message in the editor.
 *
 * @param message - The error message to display.
 */
export async function errorNotification(message: string) {
  console.error(message);
  if (!showErrors) {
    return;
  }
  vscode.window.showErrorMessage(message, { modal: false });
}

/**
 * Prompts unauthenticated users to either sign in or sign up.
 *
 * Displays an informational notification with "Sign In" and "Sign Up" options,
 * and triggers the appropriate authentication workflow based on the user's choice.
 */
export async function authNotification() {
  const choice = await vscode.window.showInformationMessage(
    "You are not authenticated. Please sign in to track your progress!",
    "Sign In",
    "Sign Up"
  );

  if (choice === "Sign In") {
    await signInMenu();
  } else if (choice === "Sign Up") {
    await handleSignUp();
  }
}


/**
 * Notifies the user with a sign-out prompt.
 *
 * If the user confirms, triggers the sign-out process.
 *
 * @param messsage - The message to display with the sign-out option.
 */
export async function authSignOutNotification(messsage: string) {
  const signOutChoice = await vscode.window.showInformationMessage(
    `${messsage}`,
    "Sign Out"
  );

  if (signOutChoice === "Sign Out") {
    await handleSignOut();
  }
}

/**
 * Shows a temporary warning notification in the VS Code status bar.
 *
 * Displays the message for 2 seconds before automatically dismissing it.
 *
 * @param message - The message to display in the status bar.
 */
export async function showAuthNotification(message: string) {
  //   vscode.window.showInformationMessage(message, { modal: false });
  const notification = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    90
  );

  notification.text = `$(info) ${message}`;
  notification.color = new vscode.ThemeColor("statusBarItem.warningForeground");
  notification.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.warningBackground"
  );
  notification.show();

  // Auto-dismiss after 2 seconds
  setTimeout(() => {
    notification.hide();
    notification.dispose();
  }, 2000);
}

