import * as vscode from "vscode";

// Import the module under test
import * as notificationsModule from "../views/notifications";

// Mock auth-service functions
jest.mock("../services/auth-service", () => ({
  getAuthContext: jest.fn(),
  signInMenu: jest.fn(),
  handleSignUp: jest.fn(),
  handleSignOut: jest.fn(),
}));

const authService = require("../services/auth-service");

// -------------------------------
// VS CODE MOCKS
// -------------------------------
jest.mock("vscode", () => ({
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      text: "",
      color: "",
      backgroundColor: "",
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  StatusBarAlignment: { Right: 1 },
  ThemeColor: class {},
  env: { openExternal: jest.fn() },
  Uri: { parse: (url: string) => ({ url }) },
}));

describe("notifications utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------------------------------------
  // errorNotification
  // ------------------------------------------------------
  it("errorNotification shows VS Code error message", async () => {
    await notificationsModule.errorNotification("Oops");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "Oops",
      { modal: false }
    );
  });

  // ------------------------------------------------------
  // authNotification
  // ------------------------------------------------------
  it('authNotification triggers sign in when user chooses "Sign In"', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Sign In");

    await notificationsModule.authNotification();

    expect(authService.signInMenu).toHaveBeenCalled();
  });

  it('authNotification triggers sign up when user chooses "Sign Up"', async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Sign Up");

    await notificationsModule.authNotification();

    expect(authService.handleSignUp).toHaveBeenCalled();
  });

  it("authSignOutNotification calls handleSignOut on confirmation", async () => {
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Sign Out");

    await notificationsModule.authSignOutNotification("Sign out?");

    expect(authService.handleSignOut).toHaveBeenCalled();
  });

  // ------------------------------------------------------
  // showAuthNotification
  // ------------------------------------------------------
  it("showAuthNotification creates a temporary status bar item", async () => {
    jest.useFakeTimers();

    const mockItem = {
        text: "",
        color: "",
        backgroundColor: "",
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
    };

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockItem);

    notificationsModule.showAuthNotification("Testing");

    // Advance timers so hide() + dispose() get called
    jest.runAllTimers();

    expect(mockItem.show).toHaveBeenCalled();
    expect(mockItem.hide).toHaveBeenCalled();
    expect(mockItem.dispose).toHaveBeenCalled();

    jest.useRealTimers();
  });

  // ------------------------------------------------------
  // helpNotification
  // ------------------------------------------------------
  it("helpNotification calls errorNotification when getAuthContext returns error", async () => {
    const spy = jest.spyOn(notificationsModule, "errorNotification").mockResolvedValue(undefined);

    authService.getAuthContext.mockResolvedValue({
        context: null,
        error: "Auth error",
    });

    await notificationsModule.helpNotification("Help message");

    expect(spy).toHaveBeenCalledWith("Auth error");
  });

  it("helpNotification calls authNotification when user is unauthenticated", async () => {
    const spy = jest.spyOn(notificationsModule, "authNotification").mockResolvedValue(undefined);

    authService.getAuthContext.mockResolvedValue({
        context: null,
        error: null,
    });

    await notificationsModule.helpNotification("Help message");

    expect(spy).toHaveBeenCalled();
  });

  it("helpNotification does nothing when notifications disabled", async () => {
    authService.getAuthContext.mockResolvedValue({
      context: { settings: { show_notifications: false } },
      error: null,
    });

    await notificationsModule.helpNotification("Help message");

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it("helpNotification shows info when enabled", async () => {
    authService.getAuthContext.mockResolvedValue({
      context: { settings: { show_notifications: true } },
      error: null,
    });

    await notificationsModule.helpNotification("Help message");

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      "Help message",
      { modal: false }
    );
  });

  // ------------------------------------------------------
  // notifyUser
  // ------------------------------------------------------
  it("notifyUser calls authNotification when unauthenticated", async () => {
    const spy = jest.spyOn(notificationsModule, "authNotification").mockResolvedValue(undefined);

    authService.getAuthContext.mockResolvedValue({
        context: null,
        error: null,
    });

    await notificationsModule.notifyUser("Test");

    expect(spy).toHaveBeenCalled();
  });

  it('notifyUser opens provided URL when user chooses "Review"', async () => {
    authService.getAuthContext.mockResolvedValue({
      context: { settings: { show_notifications: true } },
      error: null,
    });

    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Review");

    await notificationsModule.notifyUser("Test", "http://example.com");

    expect(vscode.env.openExternal).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://example.com" })
    );
  });

  it("notifyUser uses default URL when none is provided", async () => {
    authService.getAuthContext.mockResolvedValue({
      context: { settings: { show_notifications: true } },
      error: null,
    });

    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Review");

    await notificationsModule.notifyUser("Test");

    expect(vscode.env.openExternal).toHaveBeenCalled();
  });

  it('notifyUser does nothing when user selects "Ignore"', async () => {
    authService.getAuthContext.mockResolvedValue({
      context: { settings: { show_notifications: true } },
      error: null,
    });

    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue("Ignore");

    await notificationsModule.notifyUser("Test");

    expect(vscode.env.openExternal).not.toHaveBeenCalled();
  });
});