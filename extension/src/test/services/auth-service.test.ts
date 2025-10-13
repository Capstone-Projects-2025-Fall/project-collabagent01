const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockShowQuickPick = jest.fn();
const mockShowInputBox = jest.fn();
const mockShowErrorMessage = jest.fn();
const mockShowInformationMessage = jest.fn();
const mockOpenExternal = jest.fn();
const mockExecuteCommand = jest.fn();
const mockSetAuthContext = jest.fn();
const mockGetAuthContext = jest.fn();

jest.mock("../../extension", () => ({
  globalContext: {
    globalState: {
      update: mockUpdate,
      get: mockGet,
    },
  },
}));

jest.mock("vscode", () => ({
  window: {
    showQuickPick: mockShowQuickPick,
    showInputBox: mockShowInputBox,
    showErrorMessage: mockShowErrorMessage,
    showInformationMessage: mockShowInformationMessage,
  },
  env: {
    openExternal: mockOpenExternal,
  },
  commands: {
    executeCommand: mockExecuteCommand,
  },
  Uri: {
    parse: jest.fn((url) => url),
  },
}));

jest.mock("../../api/auth-api", () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
}));

jest.mock("../../api/user-api", () => ({
  getUserByID: jest.fn(),
}));

jest.mock("../../api/log-api", () => ({
  trackEvent: jest.fn(),
}));

jest.mock("../../views/notifications", () => ({
  authNotification: jest.fn(),
  authSignOutNotification: jest.fn(),
  errorNotification: jest.fn(),
  showAuthNotification: jest.fn(),
}));

import * as vscode from "vscode";
import {
  setAuthContext,
  getAuthContext,
  checkUserSignIn,
  signInOrUpMenu,
  signOutMenu,
  signInMenu,
  handleSignIn,
  handleSignUp,
  signInWithGithub,
  handleSignOut,
  handleSignUpProvided,
} from "../../services/auth-service";
import { AUTH_CONTEXT, User, UserStatus } from "../../api/types/user";
import { signIn, signUp } from "../../api/auth-api";
import { getUserByID } from "../../api/user-api";
import { trackEvent } from "../../api/log-api";
import {
  authNotification,
  authSignOutNotification,
  errorNotification,
  showAuthNotification,
} from "../../views/notifications";

describe("Auth Service", () => {
  const testUser: User = {
    id: "123",
    email: "test@example.com",
    first_name: "Test",
    last_name: "User",
    isAuthenticated: true,
    isLocked: false,
    userStatus: UserStatus.ACTIVE,
    role: "admin",
    settings: {
      bug_percentage: 10,
      show_notifications: true,
      give_suggestions: false,
      enable_quiz: true,
      active_threshold: 5,
      suspend_threshold: 10,
      pass_rate: 80,
      suspend_rate: 30,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockImplementation(() => Promise.resolve());
    mockGet.mockImplementation(() => testUser);
    mockShowQuickPick.mockImplementation(() => Promise.resolve(undefined));
    mockShowInputBox.mockImplementation(() => Promise.resolve(undefined));
    mockShowInformationMessage.mockImplementation(() =>
      Promise.resolve(undefined)
    );
    mockOpenExternal.mockImplementation(() => Promise.resolve(true));
    mockSetAuthContext.mockImplementation(() => Promise.resolve({}));
    mockGetAuthContext.mockImplementation(() =>
      Promise.resolve({ context: testUser })
    );
    (signIn as jest.Mock).mockImplementation(() =>
      Promise.resolve({ token: "test-token" })
    );
    (signUp as jest.Mock).mockImplementation(() =>
      Promise.resolve({ token: "test-token" })
    );
    (getUserByID as jest.Mock).mockImplementation(() =>
      Promise.resolve({ user: testUser })
    );
    (trackEvent as jest.Mock).mockImplementation(() => Promise.resolve());
    (authNotification as jest.Mock).mockImplementation(() => Promise.resolve());
    (authSignOutNotification as jest.Mock).mockImplementation(() =>
      Promise.resolve()
    );
    (errorNotification as jest.Mock).mockImplementation(() =>
      Promise.resolve()
    );
    (showAuthNotification as jest.Mock).mockImplementation(() =>
      Promise.resolve()
    );
  });

  describe("setAuthContext", () => {
    it("should update global state with user data", async () => {
      mockUpdate.mockResolvedValue(undefined);

      const result = await setAuthContext(testUser);
      expect(result).toEqual({});
      expect(mockUpdate).toHaveBeenCalledWith(AUTH_CONTEXT, testUser);
    });

    it("should return an error if globalContext is missing", async () => {
      jest.resetModules();
      jest.doMock("../../extension", () => ({}), { virtual: true });

      const {
        setAuthContext: setAuthContextWithMock,
      } = require("../../services/auth-service");
      const result = await setAuthContextWithMock(testUser);

      expect(result.error).toMatch(/Invalid user or context/);
    });

    it("should return an error if update fails", async () => {
      const error = new Error("Update failed");
      mockUpdate.mockRejectedValue(error);

      const result = await setAuthContext(testUser);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("getAuthContext", () => {
    it("should return the user from global state", async () => {
      mockGet.mockReturnValue(testUser);

      const result = await getAuthContext();
      expect(result).toEqual({ context: testUser });
      expect(mockGet).toHaveBeenCalledWith(AUTH_CONTEXT);
    });

    it("should handle errors when retrieving context", async () => {
      mockGet.mockImplementation(() => {
        throw new Error("Failed to get context");
      });

      const result = await getAuthContext();
      expect(result.error).toBe("Failed to get context");
    });
  });

  describe("checkUserSignIn", () => {
    it("should show auth notification if user is not signed in", async () => {
      mockGet.mockReturnValue(undefined);

      await checkUserSignIn();
      expect(authNotification).toHaveBeenCalled();
    });

    it("should show welcome notification if user is authenticated", async () => {
      mockGet.mockReturnValue(testUser);

      await checkUserSignIn();
      expect(showAuthNotification).toHaveBeenCalledWith(
        expect.stringContaining("Welcome back")
      );
    });

    it("should show error notification if there's an error", async () => {
      mockGet.mockImplementation(() => {
        throw new Error("Error getting context");
      });

      await checkUserSignIn();
      expect(errorNotification).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get user context")
      );
    });
  });

  describe("signInOrUpMenu", () => {
    it("should show sign out notification if user is already authenticated", async () => {
      mockGet.mockReturnValue(testUser);
      mockShowQuickPick.mockResolvedValue(undefined);

      await signInOrUpMenu();
      expect(authSignOutNotification).toHaveBeenCalledWith(
        expect.stringContaining("already signed in")
      );
    });

    it("should show sign in menu when user selects sign in", async () => {
      mockGet.mockReturnValue(undefined);
      mockShowQuickPick.mockResolvedValue("Sign in");

      await signInOrUpMenu();
      expect(mockShowQuickPick).toHaveBeenCalledWith(
        ["Sign in", "Sign up"],
        expect.any(Object)
      );
    });

    it("should handle sign up when user selects sign up", async () => {
      mockGet.mockReturnValue(undefined);
      mockShowQuickPick.mockResolvedValue("Sign up");

      await signInOrUpMenu();
      expect(mockShowQuickPick).toHaveBeenCalledWith(
        ["Sign in", "Sign up"],
        expect.any(Object)
      );
    });
  });

  describe("signOutMenu", () => {
    it("should show message if user is already signed out", async () => {
      mockGet.mockReturnValue(undefined);

      await signOutMenu();
      expect(showAuthNotification).toHaveBeenCalledWith(
        "You are already signed out."
      );
    });

    it("should show sign out confirmation if user is authenticated", async () => {
      mockGet.mockReturnValue(testUser);

      await signOutMenu();
      expect(authSignOutNotification).toHaveBeenCalledWith(
        "Are you sure you want to sign out?"
      );
    });
  });

  describe("signInMenu", () => {
    it("should show sign in options", async () => {
      mockShowQuickPick.mockResolvedValue(undefined);

      await signInMenu();
      expect(mockShowQuickPick).toHaveBeenCalledWith(
        ["Sign In with Email", "Sign In with GitHub"],
        expect.any(Object)
      );
    });

    it("should handle email sign in", async () => {
      mockShowQuickPick.mockResolvedValue("Sign In with Email");

      await signInMenu();
      expect(mockShowQuickPick).toHaveBeenCalled();
    });

    it("should handle GitHub sign in", async () => {
      mockShowQuickPick.mockResolvedValue("Sign In with GitHub");

      await signInMenu();
      expect(mockShowQuickPick).toHaveBeenCalled();
    });
  });

  describe("handleSignIn", () => {
    it("should sign in with valid credentials", async () => {
      mockShowInputBox
        .mockResolvedValueOnce("test@example.com")
        .mockResolvedValueOnce("password");
      (signIn as jest.Mock).mockResolvedValue({ token: "test-token" });
      (getUserByID as jest.Mock).mockResolvedValue({ user: testUser });

      mockUpdate.mockResolvedValue(undefined);

      await handleSignIn();
      expect(signIn).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockUpdate).toHaveBeenCalledWith(AUTH_CONTEXT, testUser);
      expect(showAuthNotification).toHaveBeenCalledWith(
        "Sign In successfully! 🎉"
      );
    });

    it("should offer sign up when account not found", async () => {
      mockShowInputBox
        .mockResolvedValueOnce("test@example.com")
        .mockResolvedValueOnce("password");
      (signIn as jest.Mock).mockResolvedValue({ error: "Invalid credentials" });
      mockShowInformationMessage.mockResolvedValue("No");

      await handleSignIn();
      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        "Account not found. Would you like to sign up with this Email and Password?",
        "Yes",
        "No"
      );
    });
  });

  describe("handleSignUp", () => {
    it("should sign up with valid information", async () => {
      mockShowInputBox
        .mockResolvedValueOnce("Test")
        .mockResolvedValueOnce("User")
        .mockResolvedValueOnce("test@example.com")
        .mockResolvedValueOnce("password");
      (signUp as jest.Mock).mockResolvedValue({ token: "test-token" });
      (getUserByID as jest.Mock).mockResolvedValue({ user: testUser });

      mockUpdate.mockResolvedValue(undefined);

      await handleSignUp();
      expect(signUp).toHaveBeenCalledWith(
        "test@example.com",
        "password",
        "Test",
        "User"
      );
      expect(mockUpdate).toHaveBeenCalledWith(AUTH_CONTEXT, testUser);
      expect(showAuthNotification).toHaveBeenCalledWith(
        "Sign Up successfully! 🎉"
      );
    });

    it("should show error if sign up fails", async () => {
      mockShowInputBox
        .mockResolvedValueOnce("Test")
        .mockResolvedValueOnce("User")
        .mockResolvedValueOnce("test@example.com")
        .mockResolvedValueOnce("password");
      (signUp as jest.Mock).mockResolvedValue({ error: "Sign up failed" });

      await handleSignUp();
      expect(errorNotification).toHaveBeenCalledWith(
        expect.stringContaining("Sign Up failed")
      );
    });
  });

  describe("handleSignUpProvided", () => {
    it("should sign up with provided email and password", async () => {
      mockShowInputBox
        .mockResolvedValueOnce("Test")
        .mockResolvedValueOnce("User");
      (signUp as jest.Mock).mockResolvedValue({ token: "test-token" });
      (getUserByID as jest.Mock).mockResolvedValue({ user: testUser });

      mockUpdate.mockResolvedValue(undefined);

      await handleSignUpProvided("test@example.com", "password");
      expect(signUp).toHaveBeenCalledWith(
        "test@example.com",
        "password",
        "Test",
        "User"
      );
      expect(mockUpdate).toHaveBeenCalledWith(AUTH_CONTEXT, testUser);
      expect(showAuthNotification).toHaveBeenCalledWith(
        "Sign Up successfully! 🎉"
      );
    });
  });
});
