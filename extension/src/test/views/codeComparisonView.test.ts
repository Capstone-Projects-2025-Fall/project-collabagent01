import * as vscode from "vscode";
import { createCodeComparisonWebview } from "../../views/CodeComparisonView";
import { escapeHtml } from "../../utils";

// ✅ Mock globalContext before importing the module that uses it
jest.mock("../../extension", () => ({
  globalContext: {
    subscriptions: [],
  },
}));

jest.mock("vscode", () => {
  const original = jest.requireActual("vscode");
  return {
    ...original,
    window: {
      ...original.window,
      createWebviewPanel: jest.fn(() => ({
        webview: {
          html: "",
          onDidReceiveMessage: jest.fn(),
        },
        dispose: jest.fn(),
      })),
    },
    ViewColumn: {
      Beside: 2,
    },
  };
});

jest.mock("../../utils", () => ({
  escapeHtml: jest.fn((text) => text),
}));

describe("createCodeComparisonWebview", () => {
  const rightCode = "console.log('correct');";
  const wrongCode = "console.log('wrong');";
  const explanation = "This is why it's wrong.";

  it("should create a webview panel with correct HTML content", () => {
    createCodeComparisonWebview(rightCode, wrongCode, explanation);

    const createPanel = vscode.window.createWebviewPanel as jest.Mock;
    expect(createPanel).toHaveBeenCalledWith(
      "codeComparison",
      "Code Comparison",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    const panel = createPanel.mock.results[0].value;
    expect(panel.webview.html).toContain(rightCode);
    expect(panel.webview.html).toContain(wrongCode);
    expect(panel.webview.html).toContain(explanation);
  });

  it("should register a message handler", () => {
    createCodeComparisonWebview(rightCode, wrongCode, explanation);
    const panel = (vscode.window.createWebviewPanel as jest.Mock).mock
      .results[0].value;
    expect(panel.webview.onDidReceiveMessage).toHaveBeenCalled();
  });
});
