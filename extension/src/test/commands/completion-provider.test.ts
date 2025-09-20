jest.mock("vscode", () => ({
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  languages: {
    registerInlineCompletionItemProvider: jest.fn(),
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    createStatusBarItem: jest.fn(),
    registerUriHandler: jest.fn(),
  },
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
  Position: jest.fn(),
  CancellationToken: jest.fn(),
}));

jest.mock("../../services/suggestion-service", () => ({
  resetDebounceTimeout: jest.fn(),
  setDebounceTimeout: jest.fn(),
  setLastRequest: jest.fn(),
}));

jest.mock("../../services/auth-service", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("../../views/notifications", () => ({
  errorNotification: jest.fn(),
  authNotification: jest.fn(),
}));

import { provideInlineCompletionItems } from "../../commands/completion-provider";

import {
  resetDebounceTimeout,
  setDebounceTimeout,
  setLastRequest,
} from "../../services/suggestion-service";

import { getAuthContext } from "../../services/auth-service";
import { errorNotification, authNotification } from "../../views/notifications";

describe("Inline Completion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return [] and call errorNotification if getAuthContext returns error", async () => {
    (getAuthContext as jest.Mock).mockResolvedValue({
      context: null,
      error: "Something went wrong",
    });

    const result = await provideInlineCompletionItems(
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    expect(result).toEqual([]);
    expect(errorNotification).toHaveBeenCalledWith(
      "Failed to get user context: Something went wrong"
    );
  });

  it("should return [] and call authNotification if user context is null", async () => {
    (getAuthContext as jest.Mock).mockResolvedValue({
      context: null,
      error: null,
    });

    const result = await provideInlineCompletionItems(
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    expect(result).toEqual([]);
    expect(authNotification).toHaveBeenCalled();
  });

  it("should return [] if user context exists but suggestions are disabled", async () => {
    (getAuthContext as jest.Mock).mockResolvedValue({
      context: { settings: { give_suggestions: false } },
      error: null,
    });

    const result = await provideInlineCompletionItems(
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    expect(result).toEqual([]);
    expect(resetDebounceTimeout).not.toHaveBeenCalled();
    expect(setLastRequest).not.toHaveBeenCalled();
  });

  it("should call debounce functions and return suggestion when enabled", async () => {
    const mockItem = { insertText: "suggested()" };

    (getAuthContext as jest.Mock).mockResolvedValue({
      context: { settings: { give_suggestions: true } },
      error: null,
    });

    (setDebounceTimeout as jest.Mock).mockImplementation((cb) =>
      cb([mockItem])
    );

    const result = await provideInlineCompletionItems(
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    expect(resetDebounceTimeout).toHaveBeenCalled();
    expect(setLastRequest).toHaveBeenCalled();
    expect(setDebounceTimeout).toHaveBeenCalled();
    expect(result).toEqual([mockItem]);
  });
});
