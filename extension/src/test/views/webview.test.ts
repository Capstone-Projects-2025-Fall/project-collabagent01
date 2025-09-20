import * as vscode from "vscode";
import { showLoginWebview } from "../../views/webview";

jest.mock("vscode", () => {
  const original = jest.requireActual("vscode");

  return {
    ...original,
    ViewColumn: {
      One: 1,
    },
    window: {
      ...original.window,
      createWebviewPanel: jest.fn(() => ({
        webview: {
          html: "",
          onDidReceiveMessage: jest.fn(),
        },
        dispose: jest.fn(),
      })),
      showInformationMessage: jest.fn(),
    },
  };
});

describe("showLoginWebview", () => {
  const mockContext = {
    globalState: { update: jest.fn() },
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;

  it("should create a webview panel with the correct title and HTML", () => {
    showLoginWebview(mockContext);

    const createPanel = vscode.window.createWebviewPanel as jest.Mock;
    expect(createPanel).toHaveBeenCalledWith(
      "loginWebview",
      "Log in to Copilot Clone",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const panel = createPanel.mock.results[0].value;
    expect(panel.webview.html).toContain("<title>Supabase Login</title>");
    expect(panel.webview.html).toContain("handleLogin()");
  });

  it("should set up message listener", () => {
    showLoginWebview(mockContext);

    const panel = (vscode.window.createWebviewPanel as jest.Mock).mock
      .results[0].value;
    expect(panel.webview.onDidReceiveMessage).toHaveBeenCalled();
  });
});
