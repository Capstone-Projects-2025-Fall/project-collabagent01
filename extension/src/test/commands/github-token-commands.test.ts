// src/test/commands/github-token-commands.test.ts
jest.mock("vscode");

jest.mock("../../services/github-verification-service", () => ({
  storeGitHubAccessToken: jest.fn(),
  clearGitHubAccessToken: jest.fn(),
}));

// Mock extension global context for checkGitHubTokenCommand
jest.mock("../../extension", () => ({
  globalContext: {
    globalState: {
      get: jest.fn(),
    },
  },
}));

// ---- mock fetch in a TS-safe way ----
const globalAny: any = global;
const mockFetch = jest.fn();
globalAny.fetch = mockFetch;

describe("github-token-commands", () => {
  const loadModules = () => {
    const vscode = require("vscode");
    const tokenService = require("../../services/github-verification-service");
    const extension = require("../../extension");
    const commands = require("../../commands/github-token-commands");
    return { vscode, tokenService, extension, commands };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // --------------------------------------------------------------------
  // setGitHubTokenCommand
  // --------------------------------------------------------------------

  test("setGitHubTokenCommand exits when user cancels input", async () => {
    const { vscode } = loadModules();

    vscode.window.showInputBox.mockResolvedValue(undefined);

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.setGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("setGitHubTokenCommand shows error on 401 invalid token", async () => {
    const { vscode } = loadModules();

    vscode.window.showInputBox.mockResolvedValue("ghp_invalid");

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.setGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "Invalid GitHub token. Please check your token and try again."
    );
  });

  test("setGitHubTokenCommand verifies and stores valid token", async () => {
    const { vscode, tokenService } = loadModules();

    vscode.window.showInputBox.mockResolvedValue("ghp_valid");

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ login: "testuser" }),
    });

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.setGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(tokenService.storeGitHubAccessToken).toHaveBeenCalledWith("ghp_valid");
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      "✓ GitHub token verified and saved! Authenticated as: testuser"
    );
  });

  test("setGitHubTokenCommand handles unexpected exceptions", async () => {
    const { vscode } = loadModules();

    vscode.window.showInputBox.mockResolvedValue("ghp_valid");

    mockFetch.mockRejectedValue(new Error("Network down"));

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.setGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      "Failed to verify GitHub token: Network down"
    );
  });

  // --------------------------------------------------------------------
  // clearGitHubTokenCommand
  // --------------------------------------------------------------------

  test("clearGitHubTokenCommand clears stored token when confirmed", async () => {
    const { vscode, tokenService } = loadModules();

    vscode.window.showWarningMessage.mockResolvedValue("Yes");

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.clearGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(tokenService.clearGitHubAccessToken).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      "GitHub token cleared successfully"
    );
  });

  test("clearGitHubTokenCommand does nothing when cancelled", async () => {
    const { vscode, tokenService } = loadModules();

    vscode.window.showWarningMessage.mockResolvedValue("Cancel");

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.clearGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(tokenService.clearGitHubAccessToken).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------
  // checkGitHubTokenCommand
  // --------------------------------------------------------------------

  test("checkGitHubTokenCommand prompts to set token when none exists", async () => {
    const { vscode, extension } = loadModules();

    (extension.globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);
    vscode.window.showWarningMessage.mockResolvedValue("Set Token");

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.checkGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      "collabAgent.setGitHubToken"
    );
  });

  test("checkGitHubTokenCommand opens Learn More link", async () => {
    const { vscode, extension } = loadModules();

    (extension.globalContext.globalState.get as jest.Mock).mockReturnValue(undefined);
    vscode.window.showWarningMessage.mockResolvedValue("Learn More");

    const call = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.checkGitHubToken"
    );

    const handler = call[1];
    await handler();

    expect(vscode.env.openExternal).toHaveBeenCalled();
  });

  test("checkGitHubTokenCommand shows error for invalid stored token", async () => {
    const { vscode, extension } = loadModules();

    (extension.globalContext.globalState.get as jest.Mock).mockReturnValue("savedtoken");

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const handler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.checkGitHubToken"
    )[1];

    await handler();

    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });

  test("checkGitHubTokenCommand validates good stored token", async () => {
    const { vscode, extension } = loadModules();

    (extension.globalContext.globalState.get as jest.Mock).mockReturnValue("savedtoken");

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ login: "testuser" }),
    });

    const handler = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
      (c: any[]) => c[0] === "collabAgent.checkGitHubToken"
    )[1];

    await handler();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      "✓ GitHub token is valid! Authenticated as: testuser"
    );
  });
});
