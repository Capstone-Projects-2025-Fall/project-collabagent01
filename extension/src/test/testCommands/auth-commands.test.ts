// Make sure we use the manual VS Code mock
jest.mock("vscode");

describe("auth-commands", () => {
  const loadModules = () => {
    const vscode = require("vscode");
    const authService = require("../../services/auth-service");
    const userApi = require("../../api/user-api");
    const notifications = require("../../views/notifications");
    const authCommands = require("../../commands/auth-commands");
    return { vscode, authService, userApi, notifications, authCommands };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("signInCommand calls signInOrUpMenu when executed", async () => {
    const { vscode, authService } = loadModules();
    const signInSpy = jest
      .spyOn(authService, "signInOrUpMenu")
      .mockResolvedValue(undefined);

    // signInCommand is registered at module load time
    expect(vscode.commands.registerCommand).toHaveBeenCalled();

    const signInCall = (vscode.commands.registerCommand as jest.Mock).mock.calls
      .find((call: any[]) => call[0] === "collabAgent.signIn");

    expect(signInCall).toBeTruthy();
    const handler = signInCall[1];

    await handler();

    expect(signInSpy).toHaveBeenCalledTimes(1);
  });

  test("signOutCommand calls signOutMenu when executed", async () => {
    const { vscode, authService } = loadModules();
    const signOutSpy = jest
      .spyOn(authService, "signOutMenu")
      .mockResolvedValue(undefined);

    const signOutCall = (vscode.commands.registerCommand as jest.Mock).mock.calls
      .find((call: any[]) => call[0] === "collabAgent.signOut");

    expect(signOutCall).toBeTruthy();
    const handler = signOutCall[1];

    await handler();

    expect(signOutSpy).toHaveBeenCalledTimes(1);
  });

  test("handleAuthUri shows error when no token in /auth-complete URL", async () => {
    const { userApi, notifications, authCommands } = loadModules();
    const getUserSpy = jest.spyOn(userApi, "getUserByID").mockResolvedValue({
      user: null,
      error: null,
    });
    const errorSpy = jest
      .spyOn(notifications, "errorNotification")
      .mockResolvedValue(undefined);

    const uri = {
      path: "/auth-complete",
      query: "", // no id param
    } as any;

    await authCommands.handleAuthUri(uri);

    expect(errorSpy).toHaveBeenCalledWith("No token found in URL.");
    expect(getUserSpy).not.toHaveBeenCalled();
  });

  test("handleAuthUri sets auth context and notifies on successful /auth-complete", async () => {
    const { vscode, authService, userApi, notifications, authCommands } =
      loadModules();

    const user = { id: "123", email: "test@example.com", isAuthenticated: false };

    jest
      .spyOn(userApi, "getUserByID")
      .mockResolvedValue({ user, error: null });

    const setAuthContextSpy = jest
      .spyOn(authService, "setAuthContext")
      .mockResolvedValue({ error: null });

    const errorSpy = jest
      .spyOn(notifications, "errorNotification")
      .mockResolvedValue(undefined);

    const successSpy = jest
      .spyOn(notifications, "showAuthNotification")
      .mockResolvedValue(undefined);

    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

    const uri = {
      path: "/auth-complete",
      query: "id=123",
    } as any;

    await authCommands.handleAuthUri(uri);

    expect(userApi.getUserByID).toHaveBeenCalledWith("123");
    expect(setAuthContextSpy).toHaveBeenCalledTimes(1);
    const passedUser = setAuthContextSpy.mock.calls[0][0] as { isAuthenticated: boolean };
    expect(passedUser.isAuthenticated).toBe(true);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalledWith("Sign In successfully! 🎉");
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "collabAgent.authStateChanged"
    );
  });

  test("handleAuthUri shows error when getUserByID returns error", async () => {
    const { userApi, notifications, authCommands } = loadModules();

    jest.spyOn(userApi, "getUserByID").mockResolvedValue({
      user: null,
      error: "User not found",
    });

    const errorSpy = jest
      .spyOn(notifications, "errorNotification")
      .mockResolvedValue(undefined);

    const uri = {
      path: "/auth-complete",
      query: "id=missing",
    } as any;

    await authCommands.handleAuthUri(uri);

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to get user data: User not found"
    );
  });

  test("handleAuthUri shows error when setAuthContext returns error", async () => {
    const { authService, userApi, notifications, authCommands } = loadModules();

    jest.spyOn(userApi, "getUserByID").mockResolvedValue({
      user: { id: "1", email: "x@example.com" },
      error: null,
    });

    jest
      .spyOn(authService, "setAuthContext")
      .mockResolvedValue({ error: "ctx error" });

    const errorSpy = jest
      .spyOn(notifications, "errorNotification")
      .mockResolvedValue(undefined);

    const uri = {
      path: "/auth-complete",
      query: "id=1",
    } as any;

    await authCommands.handleAuthUri(uri);

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to set user context: ctx error"
    );
  });

  test("createAuthStatusBarItem reflects authenticated user state", async () => {
    const { vscode, authService, authCommands } = loadModules();

    jest.spyOn(authService, "getAuthContext").mockResolvedValue({
      context: { isAuthenticated: true, email: "test@example.com" },
    });

    const ctx = { subscriptions: [] as any[] };
    const item = authCommands.createAuthStatusBarItem(ctx as any);

    // wait for async updateAuthStatus to run
    await new Promise(setImmediate);

    expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
      vscode.StatusBarAlignment.Right,
      100
    );

    expect(item.text).toBe("$(sign-out) Sign Out");
    expect(item.tooltip).toBe("Signed in as test@example.com");
    expect(item.command).toBe("collabAgent.signOut");

    // status bar item + 2 commands should be subscribed
    expect(ctx.subscriptions.length).toBe(3);
  });

  test("createAuthStatusBarItem reflects unauthenticated user state", async () => {
    const { authService, authCommands } = loadModules();

    jest.spyOn(authService, "getAuthContext").mockResolvedValue({
      context: { isAuthenticated: false },
    });

    const ctx = { subscriptions: [] as any[] };
    const item = authCommands.createAuthStatusBarItem(ctx as any);

    await new Promise(setImmediate);

    expect(item.text).toBe("$(key) Sign in with GitHub");
    expect(item.tooltip).toBe("Authenticate with GitHub");
    expect(item.command).toBe("collabAgent.signIn");
  });

  test("uriHandlerCommand registers a URI handler using handleAuthUri", () => {
    const { vscode, authCommands } = loadModules();

    expect(vscode.window.registerUriHandler).toHaveBeenCalledTimes(1);
    const call = (vscode.window.registerUriHandler as jest.Mock).mock.calls[0];
    const handlerObj = call[0];

    expect(handlerObj).toHaveProperty("handleUri");
    expect(handlerObj.handleUri).toBe(authCommands.handleAuthUri);
  });

  test("registerAuthCommands registers additional auth-related commands", () => {
    const { vscode, authCommands } = loadModules();

    (vscode.commands.registerCommand as jest.Mock).mockClear();
    (vscode.window.registerUriHandler as jest.Mock).mockClear();

    authCommands.registerAuthCommands();

    const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
    const commandIds = calls.map((c: any[]) => c[0]);

    expect(commandIds).toContain("collabAgent.signIn");
    expect(commandIds).toContain("collabAgent.signOut");
    expect(commandIds).toContain("collabAgent.authStateChanged");

    expect(vscode.window.registerUriHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleUri: authCommands.handleAuthUri })
    );
  });
});
