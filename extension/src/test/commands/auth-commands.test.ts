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
});
