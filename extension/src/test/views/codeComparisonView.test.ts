// CodeComparisonView was removed; skip these tests to avoid referencing deleted view.
import * as vscode from "vscode";

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

describe.skip("createCodeComparisonWebview (removed)", () => {
  it("skipped", () => {
    expect(true).toBe(true);
  });
});
