import * as vscode from "vscode";
import {
  errorNotification,
  authNotification,
  authSignOutNotification,
  showAuthNotification,
  helpNotification,
  notifyUser,
} from "../../views/notifications";

jest.useFakeTimers();

// ✅ FIX: Mock ThemeColor constructor to return string properly
jest.mock("vscode", () => {
  const actualVscode = jest.requireActual("vscode");

  function MockThemeColor(value: string) {
    return value; // so new ThemeColor("...") === "..."
  }

  return {
    ...actualVscode,
    window: {
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      createStatusBarItem: jest.fn(() => ({
        text: "",
        color: undefined,
        backgroundColor: undefined,
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
      })),
    },
    env: {
      openExternal: jest.fn(),
    },
    ThemeColor: MockThemeColor,
    Uri: {
      parse: jest.fn((url) => url),
    },
    StatusBarAlignment: {
      Right: 2,
    },
  };
});

jest.mock("../../services/auth-service", () => ({
  getAuthContext: jest.fn(),
  signInMenu: jest.fn(),
  handleSignUp: jest.fn(),
  handleSignOut: jest.fn(),
}));

import {
  getAuthContext,
  signInMenu,
  handleSignUp,
  handleSignOut,
} from "../../services/auth-service";

describe("Notification utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("errorNotification", () => {
    it("should show error message", async () => {
      await errorNotification("Something went wrong");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Something went wrong",
        { modal: false }
      );
    });
  });

  describe("authNotification", () => {
    it("should call signInMenu on 'Sign In'", async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Sign In"
      );
      await authNotification();
      expect(signInMenu).toHaveBeenCalled();
    });

    it("should call handleSignUp on 'Sign Up'", async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Sign Up"
      );
      await authNotification();
      expect(handleSignUp).toHaveBeenCalled();
    });

    it("should do nothing on dismiss", async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        undefined
      );
      await authNotification();
      expect(signInMenu).not.toHaveBeenCalled();
      expect(handleSignUp).not.toHaveBeenCalled();
    });
  });

  describe("authSignOutNotification", () => {
    it("should call handleSignOut if selected", async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Sign Out"
      );
      await authSignOutNotification("Session expired");
      expect(handleSignOut).toHaveBeenCalled();
    });

    it("should do nothing if dismissed", async () => {
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        undefined
      );
      await authSignOutNotification("Session expired");
      expect(handleSignOut).not.toHaveBeenCalled();
    });
  });

  describe("helpNotification", () => {
    it("should show error notification if getAuthContext fails", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: null,
        error: "Auth error",
      });
      await helpNotification("Need help?");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Auth error",
        {
          modal: false,
        }
      );
    });

    it("should prompt auth if no context", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: null,
        error: null,
      });
      await helpNotification("Need help?");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "You are not authenticated. Please sign in to track your progress!",
        "Sign In",
        "Sign Up"
      );
    });

    it("should not show message if settings.disabled", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: { settings: { show_notifications: false } },
        error: null,
      });
      await helpNotification("Should not show this");
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it("should show message if allowed", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: { settings: { show_notifications: true } },
        error: null,
      });
      await helpNotification("This is helpful");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "This is helpful",
        {
          modal: false,
        }
      );
    });
  });

  describe("notifyUser", () => {
    it("should call errorNotification if auth fails", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: null,
        error: "nope",
      });
      await notifyUser("Hello");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("nope", {
        modal: false,
      });
    });

    it("should prompt auth if not signed in", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: null,
        error: null,
      });
      await notifyUser("Hello");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "You are not authenticated. Please sign in to track your progress!",
        "Sign In",
        "Sign Up"
      );
    });

    it("should skip if notifications are off", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: { settings: { show_notifications: false } },
        error: null,
      });
      await notifyUser("skip");
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it("should open external URL on 'Review'", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: { settings: { show_notifications: true } },
        error: null,
      });

      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Review"
      );

      await notifyUser("Please check", "https://example.com", true);
      expect(vscode.env.openExternal).toHaveBeenCalledWith(
        "https://example.com"
      );
    });

    it("should default to clover site if no URL", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: { settings: { show_notifications: true } },
        error: null,
      });

      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Review"
      );

      await notifyUser("Default test");
      expect(vscode.env.openExternal).toHaveBeenCalledWith(
        "https://clover.nickrucinski.com/"
      );
    });
  });
});
