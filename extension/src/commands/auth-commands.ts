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
 * Supports both custom backend auth and Supabase OAuth callbacks.
 * 
 * @param uri - The URI containing authentication data
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

      vscode.commands.executeCommand("collabAgent.authStateChanged");
    } catch (err: any) {
      await errorNotification(`Unexpected error: ${err.message}`);
    }
  }
  
  if (uri.path === "/auth/callback") {
    try {
      const { getSupabase } = require("../auth/supabaseClient");
      const supabase = getSupabase();
      // Supabase sends tokens in the fragment (#) for OAuth redirect flows
      if (uri.fragment) {
        const frag = new URLSearchParams(uri.fragment.replace(/^#/, ""));
        const access_token = frag.get("access_token");
        const refresh_token = frag.get("refresh_token");
        if (access_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token: refresh_token || "" });
          } catch (e:any) {
            await errorNotification(`Failed to set Supabase session: ${e.message}`);
          }
        }
      }
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        await errorNotification(`Supabase auth error: ${error.message}`);
        return;
      }
      if (!user) {
        await errorNotification("No Supabase user in session.");
        return;
      }
      
      const minimalUser = {
        id: user.id,
        email: user.email || "",
        first_name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        last_name: "",
        isLocked: false,
        isAuthenticated: true,
        userStatus: "ACTIVE",
        role: "user",
        settings: {
          bug_percentage: 0,
          show_notifications: true,
          give_suggestions: true,
          enable_quiz: false,
          active_threshold: 0,
          suspend_threshold: 0,
          pass_rate: 0,
          suspend_rate: 0
        }
      } as any;
      const { setAuthContext } = require("../services/auth-service");
      const { error: ctxErr } = await setAuthContext(minimalUser);
      if (ctxErr) {
        await errorNotification(`Failed to set auth context: ${ctxErr}`);
        return;
      }
      await showAuthNotification(`Signed in as ${minimalUser.email}`);
      vscode.commands.executeCommand("collabAgent.authStateChanged");
    } catch (e: any) {
      await errorNotification(`OAuth callback failed: ${e.message}`);
    }
  }
};

/** URI handler command for processing authentication callbacks */
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

  authStatusBarItem.name = "Collab Agent Authentication";
  authStatusBarItem.backgroundColor = new vscode.ThemeColor(
    "statusBarItem.errorBackground"
  );
  authStatusBarItem.show();

  const updateAuthStatus = async () => {
    const { context: user } = await getAuthContext();

    if (user?.isAuthenticated) {
      authStatusBarItem.text = `$(sign-out) Sign Out`;
      authStatusBarItem.tooltip = `Signed in as ${user.email}`;
  authStatusBarItem.command = "collabAgent.signOut";
      authStatusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.errorBackground"
      );
    } else {
      authStatusBarItem.text = `$(key) Sign In / Sign Up`;
  authStatusBarItem.tooltip = "Authenticate with Collab Agent";
  authStatusBarItem.command = "collabAgent.signIn";
      authStatusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground"
      );
    }
  };

  updateAuthStatus();

  context.subscriptions.push(
    authStatusBarItem,
  vscode.commands.registerCommand("collabAgent.showAuthOptions", async () => {
      const choice = await vscode.window.showQuickPick(
        ["Sign In with GitHub", "Sign In with Email", "Sign Up"],
        { placeHolder: "Select authentication method" }
      );

      if (choice === "Sign In with GitHub") {
  vscode.commands.executeCommand("collabAgent.githubLogin");
      } else if (choice === "Sign In with Email") {
  vscode.commands.executeCommand("collabAgent.emailLogin");
      } else if (choice === "Sign Up") {
  vscode.commands.executeCommand("collabAgent.signUp");
      }
    }),

    vscode.commands.registerCommand("collabAgent.authStateChanged", updateAuthStatus)
  );

  return authStatusBarItem;
}

/**
 * Registers all authentication-related commands with VS Code.
 */
export function registerAuthCommands() {
  vscode.commands.registerCommand("collabAgent.signIn", async () => signInOrUpMenu());
  vscode.commands.registerCommand("collabAgent.signOut", async () => signOutMenu());
  vscode.commands.registerCommand("collabAgent.authStateChanged", async () => {
    const item = createAuthStatusBarItem({ subscriptions: [] } as any);
    item.show();
  });
  vscode.window.registerUriHandler({ handleUri: handleAuthUri });
}
