import {
  getAuthContext,
  signInOrUpMenu,
  signOutMenu,
} from "../services/auth-service";
import * as vscode from "vscode";
import { getUserByID } from "../api/user-api";
import { setAuthContext } from "../services/auth-service";
import {
  errorNotification,
  showAuthNotification,
} from "../views/notifications";

/**
 * Registers the command to trigger the Sign In or Sign Up menu.
 */
export const signInCommand = vscode.commands.registerCommand(
  "collabAgent.signIn",
  async () => signInOrUpMenu()
);

/**
 * Registers the command to trigger the Sign Out flow.
 */
export const signOutCommand = vscode.commands.registerCommand(
  "collabAgent.signOut",
  async () => signOutMenu()
);

/**
 * Handles URIs sent back to the extension after OAuth authentication flow.
 *
 * Specifically listens for the `/auth-complete` URI, extracts the user token,
 * fetches the user, and updates the authentication context.
 */
export const handleAuthUri = async (uri: vscode.Uri) => {
  if (uri.path === "/auth-complete") {
    const urlParams = new URLSearchParams(uri.query);
    const token = urlParams.get("id"); // Extract token
    if (!token) {
      await errorNotification("No token found in URL.");
      return;
    }

    try {
      const { user, error } = await getUserByID(token);

      if (error || !user) {
        await errorNotification(`Failed to get user data: ${error}`);
        return;
      }

      user.isAuthenticated = true;

      const { error: authError } = await setAuthContext(user);

      if (authError) {
        await errorNotification(`Failed to set user context: ${authError}`);
        return;
      }
      await showAuthNotification(`Sign In successfully! 🎉`);

      vscode.commands.executeCommand("clover.authStateChanged");
    } catch (err: any) {
      await errorNotification(`Unexpected error: ${err.message}`);
    }
  }
};

export const uriHandlerCommand = vscode.window.registerUriHandler({
  handleUri: handleAuthUri,
});

/**
 * Creates and manages the authentication status bar item for the extension.
 *
 * Dynamically updates the status bar based on the user's authentication state.
 *
 * @param context - The extension context for managing command subscriptions.
 * @returns A `StatusBarItem` representing the authentication action (sign in or sign out).
 */
export function createAuthStatusBarItem(context: vscode.ExtensionContext) {
  const authStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  authStatusBarItem.name = "Clover Authentication";
  authStatusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.errorBackground"
  );
  authStatusBarItem.show();

  const updateAuthStatus = async () => {
    const { context: user } = await getAuthContext();

    if (user?.isAuthenticated) {
      authStatusBarItem.text = `$(sign-out) Sign Out`;
      authStatusBarItem.tooltip = `Signed in as ${user.email}`;
      authStatusBarItem.command = "clover.signOut";
      authStatusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground"
      );
    } else {
      authStatusBarItem.text = `$(key) Sign In / Sign Up`;
      authStatusBarItem.tooltip = "Authenticate with Clover";
      authStatusBarItem.command = "clover.signIn";
      authStatusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground"
      );
    }
  };

  updateAuthStatus();

  context.subscriptions.push(
    authStatusBarItem,
    vscode.commands.registerCommand("clover.showAuthOptions", async () => {
      const choice = await vscode.window.showQuickPick(
        ["Sign In with GitHub", "Sign In with Email", "Sign Up"],
        { placeHolder: "Select authentication method" }
      );

      if (choice === "Sign In with GitHub") {
        vscode.commands.executeCommand("clover.githubLogin");
      } else if (choice === "Sign In with Email") {
        vscode.commands.executeCommand("clover.emailLogin");
      } else if (choice === "Sign Up") {
        vscode.commands.executeCommand("clover.signUp");
      }
    }),

    vscode.commands.registerCommand("clover.authStateChanged", updateAuthStatus)
  );

  return authStatusBarItem;
}

export function registerAuthCommands() {
  vscode.commands.registerCommand("clover.signIn", async () =>
    signInOrUpMenu()
  );
  vscode.commands.registerCommand("clover.signOut", async () => signOutMenu());
  vscode.commands.registerCommand("clover.authStateChanged", async () => {
    const item = createAuthStatusBarItem({ subscriptions: [] } as any);
    item.show();
  });
  vscode.window.registerUriHandler({ handleUri: handleAuthUri });
}
