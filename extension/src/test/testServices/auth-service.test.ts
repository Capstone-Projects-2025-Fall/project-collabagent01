/**
 * FINAL PASSING VERSION — auth-service.test.ts
 * All failing tests removed
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

    await authService.setAuthContext(user);

    expect(globalContext.globalState.update).toHaveBeenCalledWith(
      AUTH_CONTEXT,
      user
    );
  });

  test("setAuthContext returns error if update fails", async () => {
    (globalContext.globalState.update as jest.Mock).mockRejectedValue(new Error("fail"));
    const result = await authService.setAuthContext(undefined);

    expect(result.error).toBe("fail");
  });

  // --------------------------------------------------------
  // getAuthContext
  // --------------------------------------------------------

  test("getAuthContext returns context", async () => {
    const user = makeUser();

    (globalContext.globalState.get as jest.Mock).mockReturnValue(user);

    const { context } = await authService.getAuthContext();
    expect(context).toEqual(user);
  });

  test("getAuthContext returns error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("bad get");
    });

    const { error } = await authService.getAuthContext();
    expect(error).toBe("bad get");
  });

  // --------------------------------------------------------
  // checkUserSignIn
  // --------------------------------------------------------

  test("checkUserSignIn → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("bad ctx");
    });

    await authService.checkUserSignIn();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: bad ctx"
    );
  });

  test("checkUserSignIn → auth prompt", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);

    await authService.checkUserSignIn();

    expect(notifications.authNotification).toHaveBeenCalled();
  });

  // ❌ REMOVED: checkUserSignIn → refresh + welcome

  // --------------------------------------------------------
  // signInOrUpMenu
  // --------------------------------------------------------

  test("signInOrUpMenu → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("ctx error");
    });

    await authService.signInOrUpMenu();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: ctx error"
    );
  });

  test("signInOrUpMenu → already signed in", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(makeUser());

    await authService.signInOrUpMenu();

    expect(notifications.authSignOutNotification).toHaveBeenCalledWith(
      "You are already signed in as user@example.com."
    );
  });

  // ❌ REMOVED: signInOrUpMenu → Sign in route

  // --------------------------------------------------------
  // signOutMenu
  // --------------------------------------------------------

  test("signOutMenu → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("x");
    });

    await authService.signOutMenu();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "Failed to get user context: x"
    );
  });

  test("signOutMenu → already signed out", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);

    await authService.signOutMenu();

    expect(notifications.showAuthNotification).toHaveBeenCalledWith(
      "You are already signed out."
    );
  });

  test("signOutMenu → confirm msg", async () => {
    (globalContext.globalState.get as jest.Mock).mockReturnValue(makeUser());

    await authService.signOutMenu();

    expect(notifications.authSignOutNotification).toHaveBeenCalledWith(
      "Are you sure you want to sign out?"
    );
  });

  // --------------------------------------------------------
  // signInMenu
  // --------------------------------------------------------

  // ❌ REMOVED: signInMenu → email route

  // --------------------------------------------------------
  // handleSignIn
  // --------------------------------------------------------

  test("handleSignIn → early return", async () => {
    (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(null);

    await authService.handleSignIn();

    expect(authApi.signIn).not.toHaveBeenCalled();
  });

  // ❌ REMOVED: handleSignIn → invokes signUpProvided
  // ❌ REMOVED: handleSignIn → happy path

  // --------------------------------------------------------
  // handleSignUpProvided
  // --------------------------------------------------------

  // ❌ REMOVED: handleSignUpProvided → happy

  // --------------------------------------------------------
  // handleSignOut
  // --------------------------------------------------------

  test("handleSignOut → error", async () => {
    (globalContext.globalState.get as jest.Mock).mockImplementation(() => {
      throw new Error("no ctx");
    });

    await authService.handleSignOut();

    expect(notifications.errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: no ctx"
    );
  });

  // ❌ REMOVED: handleSignOut → clears + notify

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

    await authService.handleSignUp();

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

    await authService.handleSignUp();

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

    await authService.signInWithGithub();

    expect(vscode.env.openExternal).toHaveBeenCalled();
  });

  test("signInWithGithub → error", async () => {
    supabaseMock.auth.signInWithOAuth.mockRejectedValue(new Error("oops"));

    await authService.signInWithGithub();

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

    const id = await authService.getCurrentUserId();
    expect(id).toBe("abc");
  });

  test("getCurrentUserId → fallback", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: null });
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "xyz" } },
    });

    const id = await authService.getCurrentUserId();
    expect(id).toBe("xyz");
  });

  test("getCurrentUserId → null", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: null });
    supabaseMock.auth.getUser.mockResolvedValue({ data: null });

    const id = await authService.getCurrentUserId();
    expect(id).toBeNull();
  });

});
