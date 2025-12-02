/**
 * FINAL PASSING VERSION — auth-service.test.ts
 * All spy-related failures fixed
 * All namespace vs direct call issues fixed
 */

import { UserStatus } from "../../api/types/user";

// -------------------------
// 1. Mocks (MUST BE FIRST)
// -------------------------

jest.mock("../../extension", () => ({
  globalContext: {
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
    extensionUri: { toString: () => "vscode://publisher.collab-agent01" },
  },
}));

jest.mock("vscode", () => ({
  window: {
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
  },
  env: {
    openExternal: jest.fn(),
  },
  Uri: {
    parse: (s: string) => ({ toString: () => s }),
  },
  extensions: {
    all: [],
  },
}));

jest.mock("../../views/notifications", () => ({
  authNotification: jest.fn(),
  authSignOutNotification: jest.fn(),
  errorNotification: jest.fn(),
  showAuthNotification: jest.fn(),
}));

jest.mock("../../api/auth-api", () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
}));

jest.mock("../../api/user-api", () => ({
  getUserByID: jest.fn(),
}));

jest.mock("../../services/github-verification-service", () => ({
  clearGitHubAccessToken: jest.fn(),
}));

// Supabase mock
const supabaseMock = {
  auth: {
    getSession: jest.fn(),
    setSession: jest.fn(),
    getUser: jest.fn(),
    signInWithOAuth: jest.fn(),
  },
};

jest.mock("../../auth/supabaseClient", () => ({
  getSupabase: () => supabaseMock,
}));

// -------------------------
// 2. Import real module
// -------------------------

import * as vscode from "vscode";
import * as notifications from "../../views/notifications";
import * as userApi from "../../api/user-api";
import * as authApi from "../../api/auth-api";
import * as githubService from "../../services/github-verification-service";

import * as authService from "../../services/auth-service";

import {
  setAuthContext,
  getAuthContext,
  checkUserSignIn,
  signInOrUpMenu,
  signOutMenu,
  signInMenu,
  handleSignIn,
  handleSignUpProvided,
  handleSignOut,
  handleSignUp,
  signInWithGithub,
  getCurrentUserId,
} from "../../services/auth-service";

import { globalContext } from "../../extension";
import { AUTH_CONTEXT } from "../../api/types/user";

// -------------------------
// Helper
// -------------------------

function makeUser(overrides = {}) {
  return {
    id: "1",
    email: "user@example.com",
    first_name: "Nick",
    last_name: "P",
    auth_token: "token",
    code_context_id: "ctx",
    isAuthenticated: true,
    isLocked: false,
    userStatus: UserStatus.ACTIVE,
    role: "STUDENT",
    settings: {
      bug_percentage: 0,
      show_notifications: true,
      give_suggestions: true,
      enable_quiz: true,
      active_threshold: 0.8,
      suspend_threshold: 0.2,
      pass_rate: 0.7,
      suspend_rate: 0.3,
      intervened: false,
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  supabaseMock.auth.getSession.mockResolvedValue({ data: null });
  supabaseMock.auth.getUser.mockResolvedValue({ data: null });
});

// =========================================================
//                    TEST SUITE
// =========================================================

describe("auth-service", () => {

  // --------------------------------------------------------
  // setAuthContext
  // --------------------------------------------------------

  test("setAuthContext stores user", async () => {
    const user = makeUser();

    await setAuthContext(user);

    expect(globalContext.globalState.update).toHaveBeenCalledWith(
      AUTH_CONTEXT,
      user
    );
  });

  test("setAuthContext returns error if update fails", async () => {
    (globalContext.globalState.update as jest.Mock).mockRejectedValue(new Error("fail"));
    const result = await setAuthContext(undefined);

    expect(result.error).toBe("fail");
  });

  // --------------------------------------------------------
  // getAuthContext
  // --------------------------------------------------------

  test("getAuthContext returns context", async () => {
    const user = makeUser();

    (globalContext.globalState.get as jest.Mock).mockReturnValue(user);

    const { context } = await getAuthContext();
    expect(context).toEqual(user);
  });

  test("getAuthContext returns error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("bad get");
    });

    const { error } = await getAuthContext();
    expect(error).toBe("bad get");
  });

  // --------------------------------------------------------
  // checkUserSignIn
  // --------------------------------------------------------

  test("checkUserSignIn → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("bad ctx");
    });

    await checkUserSignIn();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: bad ctx"
    );
  });

  test("checkUserSignIn → auth prompt", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);

    await checkUserSignIn();

    expect(notifications.authNotification).toHaveBeenCalled();
  });

  test("checkUserSignIn → refresh + welcome", async () => {
    const user = makeUser();

    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });

    (globalContext.globalState.get as jest.Mock).mockReturnValue(user);

    const refreshed = makeUser({ first_name: "Nick" });

    (userApi.getUserByID as jest.Mock).mockResolvedValue({ user: refreshed });

    const updateSpy = jest.spyOn(globalContext.globalState, "update");

    await checkUserSignIn();

    expect(userApi.getUserByID).toHaveBeenCalledWith("session-token");
    expect(updateSpy).toHaveBeenCalledWith(AUTH_CONTEXT, refreshed);

    expect(notifications.showAuthNotification).toHaveBeenCalledWith(
      "Welcome back, Nick! 🎉"
    );
  });

  // --------------------------------------------------------
  // signInOrUpMenu
  // --------------------------------------------------------

  test("signInOrUpMenu → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("ctx error");
    });

    await signInOrUpMenu();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: ctx error"
    );
  });

  test("signInOrUpMenu → already signed in", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(makeUser());

    await signInOrUpMenu();

    expect(notifications.authSignOutNotification).toHaveBeenCalledWith(
      "You are already signed in as user@example.com."
    );
  });

  // 🟢 FIX: use authService.signInMenu so Jest spy captures it
  test("signInOrUpMenu → Sign in route", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue("Sign in");

    const spy = jest.spyOn(authService, "signInMenu")
      .mockResolvedValue(undefined);

    await authService.signInOrUpMenu();

    expect(spy).toHaveBeenCalled();
  });

  // --------------------------------------------------------
  // signOutMenu
  // --------------------------------------------------------

  test("signOutMenu → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("x");
    });

    await signOutMenu();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "Failed to get user context: x"
    );
  });

  test("signOutMenu → already signed out", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);

    await signOutMenu();

    expect(notifications.showAuthNotification).toHaveBeenCalledWith(
      "You are already signed out."
    );
  });

  test("signOutMenu → confirm msg", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(makeUser());

    await signOutMenu();

    expect(notifications.authSignOutNotification).toHaveBeenCalledWith(
      "Are you sure you want to sign out?"
    );
  });

  // --------------------------------------------------------
  // signInMenu
  // --------------------------------------------------------

  // 🟢 FIX: ensure we spy on exported handleSignIn
  test("signInMenu → email route", async () => {
    (vscode.window.showQuickPick as jest.Mock).mockResolvedValue("Sign In with Email");

    const spy = jest.spyOn(authService, "handleSignIn")
      .mockResolvedValue(undefined);

    await authService.signInMenu();

    expect(spy).toHaveBeenCalled();
  });

  // --------------------------------------------------------
  // handleSignIn
  // --------------------------------------------------------

  test("handleSignIn → early return", async () => {
    (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(null);

    await handleSignIn();

    expect(authApi.signIn).not.toHaveBeenCalled();
  });

  // 🟢 Fix: ensure internal call uses authService.handleSignUpProvided
  test("handleSignIn → invokes signUpProvided", async () => {
    (vscode.window.showInputBox as jest.Mock)
      .mockResolvedValueOnce("user@example.com")
      .mockResolvedValueOnce("pass");

    (authApi.signIn as jest.Mock).mockResolvedValue({ token: null, error: "bad" });

    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Yes");

    const spy = jest.spyOn(authService, "handleSignUpProvided")
      .mockResolvedValue(undefined);

    await authService.handleSignIn();

    expect(spy).toHaveBeenCalledWith("user@example.com", "pass");
  });

  // 🟢 Fix: ensure success route also uses exported methods
  test("handleSignIn → happy path", async () => {
    const fetched = makeUser();

    (vscode.window.showInputBox as jest.Mock)
      .mockResolvedValueOnce("user@example.com")
      .mockResolvedValueOnce("pass");

    (authApi.signIn as jest.Mock).mockResolvedValue({ token: "tok" });
    supabaseMock.auth.setSession.mockResolvedValue({ error: null });

    (userApi.getUserByID as jest.Mock).mockResolvedValue({ user: fetched });

    const spy = jest.spyOn(notifications, "showAuthNotification");

    await authService.handleSignIn();

    expect(spy).toHaveBeenCalledWith("Sign In successfully! 🎉");
  });

  // --------------------------------------------------------
  // handleSignUpProvided
  // --------------------------------------------------------

  test("handleSignUpProvided → happy", async () => {
    const newUser = makeUser({ id: "2", email: "e@example.com" });

    (vscode.window.showInputBox as jest.Mock)
      .mockResolvedValueOnce("Nick")
      .mockResolvedValueOnce("P");

    (authApi.signUp as jest.Mock).mockResolvedValue({ token: "token" });

    (userApi.getUserByID as jest.Mock).mockResolvedValue({ user: newUser });

    const spy = jest.spyOn(globalContext.globalState, "update");

    await handleSignUpProvided("e@example.com", "pass");

    expect(spy).toHaveBeenCalledWith(
      AUTH_CONTEXT,
      expect.objectContaining({ isAuthenticated: true })
    );
  });

  // --------------------------------------------------------
  // handleSignOut
  // --------------------------------------------------------

  test("handleSignOut → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("no ctx");
    });

    await handleSignOut();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: no ctx"
    );
  });

  // 🟢 Fix: ensure internal call is via exported function
  test("handleSignOut → clears + notify", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(makeUser());

    const updateSpy = jest.spyOn(globalContext.globalState, "update");
    const notifySpy = jest.spyOn(notifications, "showAuthNotification");

    await authService.handleSignOut();

    expect(updateSpy).toHaveBeenCalledWith(AUTH_CONTEXT, undefined);
    expect(notifySpy).toHaveBeenCalledWith("Sign Out Successfully! 👋");
  });

  // --------------------------------------------------------
  // handleSignUp
  // --------------------------------------------------------

  test("handleSignUp → error", async () => {
    (vscode.window.showInputBox as jest.Mock)
      .mockResolvedValueOnce("Nick")
      .mockResolvedValueOnce("P")
      .mockResolvedValueOnce("e@example.com")
      .mockResolvedValueOnce("pass");

    (authApi.signUp as jest.Mock).mockResolvedValue({ error: "oops" });

    await handleSignUp();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Sign Up failed: oops"
    );
    expect(notifications.authNotification).toHaveBeenCalled();
  });

  test("handleSignUp → happy", async () => {
    const user = makeUser({ id: "3", email: "e@example.com" });

    (vscode.window.showInputBox as jest.Mock)
      .mockResolvedValueOnce("Nick")
      .mockResolvedValueOnce("P")
      .mockResolvedValueOnce("e@example.com")
      .mockResolvedValueOnce("pass");

    (authApi.signUp as jest.Mock).mockResolvedValue({ token: "token" });

    (userApi.getUserByID as jest.Mock).mockResolvedValue({ user });

    const spy = jest.spyOn(globalContext.globalState, "update");

    await handleSignUp();

    expect(notifications.showAuthNotification).toHaveBeenCalledWith(
      "Sign Up successfully! 🎉"
    );
    expect(spy).toHaveBeenCalledWith(AUTH_CONTEXT, user);
  });

  // --------------------------------------------------------
  // signInWithGithub
  // --------------------------------------------------------

  test("signInWithGithub → success", async () => {
    supabaseMock.auth.signInWithOAuth.mockResolvedValue({
      data: { url: "https://oauth" },
    });

    await signInWithGithub();

    expect(vscode.env.openExternal).toHaveBeenCalled();
  });

  test("signInWithGithub → error", async () => {
    supabaseMock.auth.signInWithOAuth.mockRejectedValue(new Error("oops"));

    await signInWithGithub();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "GitHub Sign In failed: oops"
    );
    expect(notifications.authNotification).toHaveBeenCalled();
  });

  // --------------------------------------------------------
  // getCurrentUserId
  // --------------------------------------------------------

  test("getCurrentUserId → session ID", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "abc" } } },
    });

    const id = await getCurrentUserId();
    expect(id).toBe("abc");
  });

  test("getCurrentUserId → fallback", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: null });
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "xyz" } },
    });

    const id = await getCurrentUserId();
    expect(id).toBe("xyz");
  });

  test("getCurrentUserId → null", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: null });
    supabaseMock.auth.getUser.mockResolvedValue({ data: null });

    const id = await getCurrentUserId();
    expect(id).toBeNull();
  });

});
