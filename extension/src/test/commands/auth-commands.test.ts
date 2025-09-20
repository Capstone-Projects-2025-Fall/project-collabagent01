jest.doMock("vscode", () => {
  const commands = {
    registerCommand: jest.fn((id, cb) => {
      return { dispose: jest.fn(), _id: id, _callback: cb };
    }),
    executeCommand: jest.fn(),
  };

  const statusBarItem = {
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    text: "",
    tooltip: "",
    command: "",
    backgroundColor: undefined,
    name: "",
  };

  const languages = {
    registerInlineCompletionItemProvider: jest.fn(),
    registerCodeActionsProvider: jest.fn(),
  };

  return {
    window: {
      createStatusBarItem: jest.fn(() => statusBarItem),
      showQuickPick: jest.fn(),
      registerUriHandler: jest.fn((handler) => ({
        dispose: jest.fn(),
        _handler: handler,
      })),
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
    },
    commands,
    languages,
    StatusBarAlignment: { Left: 1, Right: 2 },
    ThemeColor: jest.fn(),
    Uri: { parse: jest.fn() },
    Disposable: { from: jest.fn((items) => items) },
    workspace: {
      getConfiguration: jest.fn(),
    },
    extensions: {
      getExtension: jest.fn(),
    },
  };
});

import * as vscode from "vscode";
import {
  registerAuthCommands,
  createAuthStatusBarItem,
} from "../../commands/auth-commands";
import {
  getAuthContext,
  setAuthContext,
  signInOrUpMenu,
  signOutMenu,
} from "../../services/auth-service";
import { getUserByID } from "../../api/user-api";
import {
  errorNotification,
  showAuthNotification,
} from "../../views/notifications";

jest.mock("../../services/auth-service");
jest.mock("../../api/user-api");
jest.mock("../../views/notifications");

describe("Authentication Commands", () => {
  let mockContext: vscode.ExtensionContext;
  let mockUri: vscode.Uri;

  beforeEach(() => {
    jest.clearAllMocks();
    registerAuthCommands();

    mockContext = {
      subscriptions: [],
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as vscode.ExtensionContext;

    mockUri = {
      path: "/auth-complete",
      query: "id=test-token",
    } as unknown as vscode.Uri;

    (getAuthContext as jest.Mock).mockResolvedValue({
      context: null,
      error: null,
    });
    (setAuthContext as jest.Mock).mockResolvedValue({ error: null });
  });

  describe("Command Registration", () => {
    it("should register signIn command", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "clover.signIn",
        expect.any(Function)
      );
    });

    it("should register signOut command", () => {
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "clover.signOut",
        expect.any(Function)
      );
    });

    it("should register URI handler", () => {
      expect(vscode.window.registerUriHandler).toHaveBeenCalled();
    });
  });

  describe("URI Handler Tests", () => {
    it("should handle auth-complete URI with valid token", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        isAuthenticated: true,
      };
      (getUserByID as jest.Mock).mockResolvedValue({
        user: mockUser,
        error: null,
      });

      const handler = (vscode.window.registerUriHandler as jest.Mock).mock
        .calls[0][0];
      await handler.handleUri(mockUri);

      expect(getUserByID).toHaveBeenCalledWith("test-token");
      expect(setAuthContext).toHaveBeenCalledWith(mockUser);
      expect(showAuthNotification).toHaveBeenCalledWith(
        "Sign In successfully! 🎉"
      );
    });

    it("should show error when no token in URI", async () => {
      const handler = (vscode.window.registerUriHandler as jest.Mock).mock
        .calls[0][0];
      const uriWithoutToken = {
        path: "/auth-complete",
        query: "",
      } as vscode.Uri;
      await handler.handleUri(uriWithoutToken);

      expect(errorNotification).toHaveBeenCalledWith("No token found in URL.");
    });

    it("should show error when user fetch fails", async () => {
      (getUserByID as jest.Mock).mockResolvedValue({
        user: null,
        error: "User not found",
      });
      const handler = (vscode.window.registerUriHandler as jest.Mock).mock
        .calls[0][0];
      await handler.handleUri(mockUri);

      expect(errorNotification).toHaveBeenCalledWith(
        "Failed to get user data: User not found"
      );
    });
  });

  describe("Sign In/Out Commands", () => {
    it("should call signInOrUpMenu when signIn command executed", async () => {
      const signInCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "clover.signIn");
      await signInCall[1]();
      expect(signInOrUpMenu).toHaveBeenCalled();
    });

    it("should call signOutMenu when signOut command executed", async () => {
      const signOutCall = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find((call) => call[0] === "clover.signOut");
      await signOutCall[1]();
      expect(signOutMenu).toHaveBeenCalled();
    });
  });

  describe("Auth Status Bar Item", () => {
    it("should create status bar item for unauthenticated user", async () => {
      createAuthStatusBarItem(mockContext);

      await new Promise(process.nextTick);

      const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock)
        .mock.results[0].value;

      expect(statusBarItem.text).toBe("$(key) Sign In / Sign Up");
      expect(statusBarItem.command).toBe("clover.signIn");
    });

    it("should create status bar item for authenticated user", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: {
          id: "123",
          email: "test@example.com",
          isAuthenticated: true,
        },
        error: null,
      });

      createAuthStatusBarItem(mockContext);

      await new Promise(process.nextTick);

      const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock)
        .mock.results[0].value;

      expect(statusBarItem.text).toBe("$(sign-out) Sign Out");
      expect(statusBarItem.tooltip).toBe("Signed in as test@example.com");
      expect(statusBarItem.command).toBe("clover.signOut");
    });

    it("should update status bar when authStateChanged command is executed", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: {
          id: "123",
          email: "test@example.com",
          isAuthenticated: true,
        },
        error: null,
      });

      const command = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find(([id]) => id === "clover.authStateChanged");

      expect(command).toBeDefined();

      await command[1]();

      const statusBarItem = (vscode.window.createStatusBarItem as jest.Mock)
        .mock.results[0].value;

      expect(statusBarItem.text).toBe("$(sign-out) Sign Out");
    });

    it("should show auth options quick pick and execute selected command", async () => {
      createAuthStatusBarItem(mockContext);

      const quickPickMock = vscode.window.showQuickPick as jest.Mock;
      quickPickMock.mockResolvedValue("Sign In with GitHub");

      const command = (
        vscode.commands.registerCommand as jest.Mock
      ).mock.calls.find(([id]) => id === "clover.showAuthOptions");

      expect(command).toBeDefined();
      await command[1]();

      expect(quickPickMock).toHaveBeenCalledWith(
        ["Sign In with GitHub", "Sign In with Email", "Sign Up"],
        { placeHolder: "Select authentication method" }
      );

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "clover.githubLogin"
      );
    });
  });
});
