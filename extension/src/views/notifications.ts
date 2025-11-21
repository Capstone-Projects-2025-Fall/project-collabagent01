import * as vscode from "vscode";
import { getAuthContext } from "../services/auth-service";
import {
  signInMenu,
  handleSignUp,
  handleSignOut,
} from "../services/auth-service";

// proxy-based self-reference, fully synchronous
const notifications: any = new Proxy(
  {},
  {
    get(_target, prop) {
      return (module.exports as any)[prop];
    }
  }
);

const showErrors = true;

/**
 * Displays an error notification to the user in VS Code.
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
 */
export async function authSignOutNotification(message: string) {
  const signOutChoice = await vscode.window.showInformationMessage(
    `${message}`,
    "Sign Out"
  );

  if (signOutChoice === "Sign Out") {
    await handleSignOut();
  }
}

/**
 * Shows a temporary warning notification in the status bar.
 */
export async function showAuthNotification(message: string) {
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

  setTimeout(() => {
    notification.hide();
    notification.dispose();
  }, 2000);
}

/**
 * Displays a help-related notification.
 */
export async function helpNotification(message: string) {
  const { context, error } = await getAuthContext();

  if (error) {
    await notifications.errorNotification(error);
    return;
  }

  if (!context) {
    await notifications.authNotification();
    return;
  }

  if (!context.settings.show_notifications) {
    return;
  }

  vscode.window.showInformationMessage(message, { modal: false });
}

/**
 * Notifies the user with a customizable informational message.
 */
export async function notifyUser(
  message: string,
  url?: string,
  isModal: boolean = false
) {
  const { context, error } = await getAuthContext();

  if (error) {
    await notifications.errorNotification(error);
    return;
  }

  if (!context) {
    await notifications.authNotification();
    return;
  }

  if (!context.settings.show_notifications) {
    return;
  }

  vscode.window
    .showInformationMessage(message, { modal: isModal }, "Review", "Ignore")
    .then((selection) => {
      if (selection === "Review") {
        vscode.env.openExternal(
          vscode.Uri.parse(
            url ||
              "https://github.com/Capstone-Projects-2025-Fall/project-collabagent01"
          )
        );
      }
    });
}