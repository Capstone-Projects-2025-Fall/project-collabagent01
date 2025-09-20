jest.mock("../../extension", () => ({
  globalContext: {
    subscriptions: [],
  },
}));

import * as vscode from "vscode";
import { createCodeCorrectionWebview } from "../../views/CodeCorrectionView";
import { submitCode } from "../../api/suggestion-api";
import { trackEvent } from "../../api/log-api";
import { getAuthContext } from "../../services/auth-service";
import { SuggestionContext } from "../../api/types/suggestion";

jest.mock("vscode", () => {
  const original = jest.requireActual("vscode");
  return {
    ...original,
    window: {
      ...original.window,
      createWebviewPanel: jest.fn(() => ({
        webview: {
          html: "",
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn(),
        },
        dispose: jest.fn(),
      })),
    },
    ViewColumn: { Beside: 2 },
  };
});

jest.mock("../../api/suggestion-api", () => ({
  submitCode: jest.fn(),
}));

jest.mock("../../api/log-api", () => ({
  trackEvent: jest.fn(),
}));

jest.mock("../../services/auth-service", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("../../utils", () => ({
  escapeHtml: (str: string) => str,
}));

const mockContext: SuggestionContext = {
  suggestionId: "sugg123",
  hasBug: true,
  prompt: "console.log(x);",
  suggestions: ["console.log(x);"],
  startTime: Date.now(),
};

describe("createCodeCorrectionWebview", () => {
  const wrongCode = "console.log(x)";
  const hint = "Make sure x is defined.";

  it("should create a webview panel and set HTML", () => {
    createCodeCorrectionWebview(wrongCode, hint, mockContext);

    const createPanel = vscode.window.createWebviewPanel as jest.Mock;
    expect(createPanel).toHaveBeenCalledWith(
      "codeCorrection",
      "Code Review & Fix",
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const panel = createPanel.mock.results[0].value;
    expect(panel.webview.html).toContain("Fix the Code");
    expect(panel.webview.html).toContain(wrongCode);
    expect(panel.webview.onDidReceiveMessage).toHaveBeenCalled();
  });

  it("should handle message and post back result", async () => {
    const mockPostMessage = jest.fn();
    const mockOnDidReceiveMessage = jest.fn();

    let messageHandler: any = null;

    mockOnDidReceiveMessage.mockImplementation((fn) => {
      messageHandler = fn;
    });

    const panelMock = {
      webview: {
        html: "",
        postMessage: mockPostMessage,
        onDidReceiveMessage: mockOnDidReceiveMessage,
      },
      dispose: jest.fn(),
    };

    // Override the mock return value
    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(panelMock);

    createCodeCorrectionWebview(wrongCode, hint, mockContext);

    (submitCode as jest.Mock).mockResolvedValue(true);
    (getAuthContext as jest.Mock).mockResolvedValue({
      context: { id: "user1" },
      error: null,
    });

    // Ensure handler is defined
    expect(typeof messageHandler).toBe("function");

    // Simulate user submitting fixed code
    await messageHandler({ command: "submitFix", code: "console.log(1);" });

    expect(submitCode).toHaveBeenCalledWith(
      wrongCode,
      "console.log(1);",
      mockContext.prompt
    );

    expect(mockPostMessage).toHaveBeenCalledWith({
      command: "showResult",
      result: "Your fix is correct! ✅",
    });

    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "USER_ANSWER_CORRECT",
        metadata: expect.objectContaining({
          user_id: "user1",
          suggestion_id: "sugg123",
          has_bug: true,
        }),
      })
    );
  });
});
