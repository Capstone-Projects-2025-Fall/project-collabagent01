import * as vscode from "vscode";
import { LogEvent } from "../api/types/event";
import { trackEvent } from "../api/log-api";
import { getUserByID } from "../api/user-api";
import { AUTH_CONTEXT, User } from "../api/types/user";
import { globalContext } from "../extension";
import { signIn, signUp } from "../api/auth-api";
import {
  authNotification,
  authSignOutNotification,
  errorNotification,
  showAuthNotification,
} from "../views/notifications";
import { BASE_URL } from "../api/types/endpoints";
import { getSupabase } from "../auth/supabaseClient";


/**
 * Sets the authentication context for the user in the VS Code global state.
 *
 * This stores the user session and authentication status for extension-wide access.
 *
 * @param user - The user object to store in global state, or `undefined` to clear authentication.
 * @returns An object containing an optional error message.
 */
export async function setAuthContext(
  user: User | undefined
): Promise<{ error?: string }> {
  try {
    if (!globalContext) {
      throw new Error("Invalid user or context provided.");
    }

    await globalContext.globalState.update(AUTH_CONTEXT, user);

    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Retrieves the current authentication context from the global extension state.
 *
 * @returns An object containing either the user context or an error message.
 */
export async function getAuthContext(): Promise<{
  context?: User;
  error?: string;
}> {
  try {
    const context = globalContext.globalState.get<User | undefined>(
      AUTH_CONTEXT
    );
    return { context };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

/**
 * Checks if a user is signed in, and if not, prompts them to authenticate.
 */
export async function checkUserSignIn() {
  const { context: user, error } = await getAuthContext();
  if (error) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  if (user === undefined) {
    await authNotification();
    return;
  }

  await getUserByID(user.id).then(async ({ user, error }) => {
    if (error) {
      await errorNotification(`Failed to get user data: ${error}`);
      return;
    }
    setAuthContext(user);
  });

  if (user.isAuthenticated) {
    await showAuthNotification(`Welcome back, ${user.first_name}! 🎉`);
    return;
  }
}

/**
 * Displays a menu for the user to sign in or sign up.
 */
export async function signInOrUpMenu() {
  const { context: user, error } = await getAuthContext();
  if (error) {
    errorNotification(`Failed to get user context: ${error}`);
    return;
  }

  if (user && user.isAuthenticated) {
    await authSignOutNotification(
      `You are already signed in as ${user.email}.`
    );
  } else {
    const signInMethod = await vscode.window.showQuickPick(
      ["Sign in", "Sign up"],
      { placeHolder: "Sign in or create an account" }
    );

    if (signInMethod === "Sign in") {
      signInMenu();
    } else if (signInMethod === "Sign up") {
      handleSignUp();
    }
  }
}

/**
 * Displays the sign-out confirmation menu.
 */
export async function signOutMenu() {
  const { context: user, error } = await getAuthContext();
  if (error) {
    vscode.window.showErrorMessage(`Failed to get user context: ${error}`);
    return;
  }
  if (!user || !user.isAuthenticated) {
    showAuthNotification(`You are already signed out.`);
    return;
  }
  await authSignOutNotification(`Are you sure you want to sign out?`);
}

/**
 * Displays a menu for the user to choose an email or GitHub sign-in method.
 */
export async function signInMenu() {
  const action = await vscode.window.showQuickPick(
    ["Sign In with Email", "Sign In with GitHub"],
    {
      placeHolder: "Select a sign-in method",
    }
  );

  if (!action) {
    return;
  }

  switch (action) {
    case "Sign In with Email":
      await handleSignIn();
      break;
    case "Sign In with GitHub":
      await signInWithGithub();
      break;
  }
}

/**
 * Handles the email and password sign-in flow.
 */
export async function handleSignIn() {
  const email = await vscode.window.showInputBox({
    prompt: "Enter your email",
    placeHolder: "sample@gmail.com",
  });
  if (!email) {
    return;
  }

  const password = await vscode.window.showInputBox({
    prompt: "Enter your password",
    placeHolder: "password",
    password: true,
  });
  if (!password) {
    return;
  }

  const { token, error } = await signIn(email, password);
  if (error || !token) {
    vscode.window.showErrorMessage(
      `Sign In failed. Email or password may be incorrect.`
    );

    const choice = await vscode.window.showInformationMessage(
      "Account not found. Would you like to sign up with this Email and Password?",
      "Yes",
      "No"
    );
    if (choice === "Yes") {
      await handleSignUpProvided(email, password);
    }
    return;
  }

  const { user, error: getUserError } = await getUserByID(token);
  if (getUserError || !user) {
    vscode.window.showErrorMessage(`Failed to get user data: ${getUserError}`);
    return;
  }
  user.isAuthenticated = true;

  const { error: authError } = await setAuthContext(user);
  if (authError) {
    vscode.window.showErrorMessage(`Failed to set user context: ${authError}`);
    return;
  }

  await showAuthNotification("Sign In successfully! 🎉");

  vscode.commands.executeCommand("collabAgent.authStateChanged");
}

/**
 * Signs up a user using email, password, and name if they are not found.
 *
 * @param email - User's email address.
 * @param password - User's password.
 */
export async function handleSignUpProvided(email: string, password: string) {
  const firstName = await vscode.window.showInputBox({
    prompt: "Enter your first name",
    placeHolder: "Example: John",
  });
  if (!firstName) {
    return;
  }
  const lastName = await vscode.window.showInputBox({
    prompt: "Enter your last name",
    placeHolder: "Example: Doe",
  });
  if (!lastName) {
    return;
  }
  const { token, error } = await signUp(email, password, firstName, lastName);
  if (error || !token) {
    vscode.window.showErrorMessage(`Sign Up failed.`);
    return;
  }
  const { user, error: getUserError } = await getUserByID(token);
  if (getUserError || !user) {
    vscode.window.showErrorMessage(`Failed to get user data: ${getUserError}`);
    return;
  }
  user.isAuthenticated = true;
  const { error: authError } = await setAuthContext(user);
  if (authError) {
    vscode.window.showErrorMessage(`Failed to set user context: ${authError}`);
    return;
  }

  await showAuthNotification("Sign Up successfully! 🎉");

  vscode.commands.executeCommand("collabAgent.authStateChanged");
}

/**
 * Signs the user out and resets the authentication context.
 */
export async function handleSignOut() {
  const { context: user, error: contextError } = await getAuthContext();
  if (contextError || !user) {
    await errorNotification(`Failed to get user context: ${contextError}`);
    return;
  }
  const { error: setAuthError } = await setAuthContext(undefined);
  if (setAuthError) {
    await errorNotification(`Failed to set user context: ${setAuthError}`);
    return;
  }
  await showAuthNotification(`Sign Out Successfully! 👋`);

  vscode.commands.executeCommand("collabAgent.authStateChanged");
}

/**
 * Handles the full email/password sign-up flow for new users.
 */
export async function handleSignUp() {
  const firstName = await vscode.window.showInputBox({
    prompt: "Enter your first name",
    placeHolder: "Example: John",
  });
  if (!firstName) {
    return;
  }

  const lastName = await vscode.window.showInputBox({
    prompt: "Enter your last name",
    placeHolder: "Example: Doe",
  });
  if (!lastName) {
    return;
  }

  const email = await vscode.window.showInputBox({
    prompt: "Enter your email",
    placeHolder: "sample@gmail.com",
  });
  if (!email) {
    return;
  }

  const password = await vscode.window.showInputBox({
    prompt: "Enter your password",
    placeHolder: "password",
    password: true,
  });
  if (!password) {
    return;
  }

  const { token, error } = await signUp(email, password, firstName, lastName);

  if (error || !token) {
    await errorNotification(`Sign Up failed: ${error}`);
    await authNotification();
  } else {
    const { user, error: getUserError } = await getUserByID(token);
    if (getUserError || !user) {
      await errorNotification(`Failed to get user data: ${getUserError}`);
      await authNotification();
      return;
    }
    await showAuthNotification("Sign Up successfully! 🎉");

    const { error } = await setAuthContext(user);
    if (error) {
      await errorNotification(`Failed to register user in backend: ${error}`);
    }

  vscode.commands.executeCommand("collabAgent.authStateChanged");
  }
}

/**
 * Signs in a user through GitHub OAuth authentication flow.
 * Opens external browser for OAuth flow and handles the callback.
 */
export async function signInWithGithub() {
  try {
  // Use require to avoid needing explicit .js extension under nodenext resolution
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getSupabase } = require("../auth/supabaseClient");
    const supabase = getSupabase();
    // Deep link registered in package.json: vscode://capstone-team-2.collab-agent01/auth/callback
    const redirectTo = "vscode://capstone-team-2.collab-agent01/auth/callback";
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo }
    });
    if (error) throw error;
    if (data?.url) {
      await vscode.env.openExternal(vscode.Uri.parse(data.url));
    } else {
      throw new Error("No OAuth URL returned from Supabase");
    }
  } catch (error: any) {
    await errorNotification(`GitHub Sign In failed: ${error.message}`);
    await authNotification();
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
