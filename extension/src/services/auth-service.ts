import * as vscode from "vscode";
import { globalContext } from "../extension";
import { AUTH_CONTEXT, User } from "../api/types/user";
import * as authApi from "../api/auth-api";
import * as userApi from "../api/user-api";
import * as notifications from "../views/notifications";
import { getSupabase } from "../auth/supabaseClient";

// ---------------------------------------------
// Helpers
// ---------------------------------------------

async function getStoredUser(): Promise<User | undefined> {
  try {
    return globalContext.globalState.get(AUTH_CONTEXT) as User | undefined;
  } catch (err: any) {
    throw new Error(err.message);
  }
}

// ---------------------------------------------
// setAuthContext
// ---------------------------------------------

export async function setAuthContext(user?: User) {
  try {
    await globalContext.globalState.update(AUTH_CONTEXT, user);
    return { context: user };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ---------------------------------------------
// getAuthContext
// ---------------------------------------------

export async function getAuthContext() {
  try {
    const context = globalContext.globalState.get(AUTH_CONTEXT) as User | undefined;
    return { context };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ---------------------------------------------
// checkUserSignIn
// ---------------------------------------------

export async function checkUserSignIn() {
  try {
    const ctx = await getStoredUser();

    if (!ctx) {
      notifications.authNotification();
      return;
    }

    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();

    const token = data?.session?.access_token;
    if (!token) return;

    const { user } = await userApi.getUserByID(token);
    if (!user) return;

    await globalContext.globalState.update(AUTH_CONTEXT, user);

    notifications.showAuthNotification(`Welcome back, ${user.first_name}! 🎉`);
  } catch (err: any) {
    notifications.errorNotification(`Failed to get user context: ${err.message}`);
  }
}

// ---------------------------------------------
// signInOrUpMenu
// ---------------------------------------------

export async function signInOrUpMenu() {
  try {
    const ctx = await getStoredUser();

    if (ctx) {
      notifications.authSignOutNotification(
        `You are already signed in as ${ctx.email}.`
      );
      return;
    }

    const choice = await vscode.window.showQuickPick(["Sign in", "Sign up"]);

    if (choice === "Sign in") {
      return signInMenu();
    }

    if (choice === "Sign up") {
      return handleSignUp();
    }
  } catch (err: any) {
    notifications.errorNotification(`Failed to get user context: ${err.message}`);
  }
}

// ---------------------------------------------
// signOutMenu
// ---------------------------------------------

export async function signOutMenu() {
  try {
    const ctx = await getStoredUser();

    if (!ctx) {
      notifications.showAuthNotification("You are already signed out.");
      return;
    }

    notifications.authSignOutNotification("Are you sure you want to sign out?");
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to get user context: ${err.message}`);
  }
}

// ---------------------------------------------
// signInMenu
// ---------------------------------------------

export async function signInMenu() {
  const choice = await vscode.window.showQuickPick([
    "Sign In with Email",
    "Sign In with GitHub",
  ]);

  if (choice === "Sign In with Email") {
    return handleSignIn();
  }

  if (choice === "Sign In with GitHub") {
    return signInWithGithub();
  }
}

// ---------------------------------------------
// handleSignIn
// ---------------------------------------------

export async function handleSignIn() {
  const email = await vscode.window.showInputBox({ prompt: "Email" });
  if (!email) return;

  const password = await vscode.window.showInputBox({
    prompt: "Password",
    password: true,
  });
  if (!password) return;

  const { token, error } = await authApi.signIn(email, password);

  if (!token || error) {
    const res = await vscode.window.showInformationMessage(
      "Sign In failed. Create new account?",
      "Yes",
      "No"
    );

    if (res === "Yes") {
      return handleSignUpProvided(email, password);
    }

    return;
  }

  const supabase = getSupabase();
  await supabase.auth.setSession({ access_token: token, refresh_token: token });

  const { user } = await userApi.getUserByID(token);

  if (user) {
    await setAuthContext(user);
    notifications.showAuthNotification("Sign In successfully! 🎉");
  }
}

// ---------------------------------------------
// handleSignUpProvided
// ---------------------------------------------

export async function handleSignUpProvided(email: string, password: string) {
  const first = await vscode.window.showInputBox({ prompt: "First Name" });
  const last = await vscode.window.showInputBox({ prompt: "Last Name" });

  const { token, error } = await authApi.signUp(
    email,
    password,
    first ?? "",
    last ?? ""
  );

  if (error || !token) {
    notifications.errorNotification(`Sign Up failed: ${error}`);
    return;
  }

  const { user } = await userApi.getUserByID(token);

  if (user) {
    user.first_name = first ?? "";
    user.last_name = last ?? "";
    user.isAuthenticated = true;

    await setAuthContext(user);
  }
}

// ---------------------------------------------
// handleSignOut
// ---------------------------------------------

export async function handleSignOut() {
  try {
    const ctx = await getStoredUser();
    if (!ctx) throw new Error("no ctx");

    await globalContext.globalState.update(AUTH_CONTEXT, undefined);
    notifications.showAuthNotification("Sign Out Successfully! 👋");
  } catch (err: any) {
    notifications.errorNotification(`Failed to get user context: ${err.message}`);
  }
}

// ---------------------------------------------
// handleSignUp
// ---------------------------------------------

export async function handleSignUp() {
  const first = await vscode.window.showInputBox({ prompt: "First Name" });
  const last = await vscode.window.showInputBox({ prompt: "Last Name" });
  const email = await vscode.window.showInputBox({ prompt: "Email" });
  const password = await vscode.window.showInputBox({
    prompt: "Password",
    password: true,
  });

  const { token, error } = await authApi.signUp(
    email ?? "",
    password ?? "",
    first ?? "",
    last ?? ""
  );

  if (error || !token) {
    notifications.errorNotification(`Sign Up failed: ${error}`);
    notifications.authNotification();
    return;
  }

  const { user } = await userApi.getUserByID(token);

  if (user) {
    await setAuthContext(user);
    notifications.showAuthNotification("Sign Up successfully! 🎉");
  }
}

// ---------------------------------------------
// GitHub OAuth
// ---------------------------------------------

export async function signInWithGithub() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.signInWithOAuth({
      provider: "github",
    });

    if (data?.url) vscode.env.openExternal(vscode.Uri.parse(data.url));
  } catch (err: any) {
    notifications.errorNotification(`GitHub Sign In failed: ${err.message}`);
    notifications.authNotification();
  }
}

// ---------------------------------------------
// getCurrentUserId
// ---------------------------------------------

export async function getCurrentUserId() {
  const supabase = getSupabase();

  const session = await supabase.auth.getSession();
  const id = session?.data?.session?.user?.id;
  if (id) return id;

  const fallback = await supabase.auth.getUser();
  return fallback?.data?.user?.id ?? null;
}
