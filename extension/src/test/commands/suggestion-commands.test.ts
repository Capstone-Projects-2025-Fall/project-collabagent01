jest.mock("vscode", () => ({
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  window: {
    activeTextEditor: {},
    showInformationMessage: jest.fn(),
    registerUriHandler: jest.fn(() => ({ dispose: jest.fn() })),
    registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
  Disposable: {
    from: jest.fn(),
  },
  workspace: {
    onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  },
  languages: {
    registerInlineCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
}));

jest.mock("../../services/log-service", () => ({
  logSuggestionEvent: jest.fn(),
}));

jest.mock("../../services/suggestion-service", () => ({
  currentChoices: [],
  suggestionContext: {},
  isSuspended: false,
  resetSuggestionContext: jest.fn(),
  handleBuggedSuggestionReview: jest.fn(),
  handleIncorrectSuggestionSelection: jest.fn(),
}));

import * as vscode from "vscode";
import { registerSuggestionCommands } from "../../commands/suggestion-commands";
import { logSuggestionEvent } from "../../services/log-service";
import {
  currentChoices,
  suggestionContext,
  isSuspended,
  resetSuggestionContext,
  handleBuggedSuggestionReview,
  handleIncorrectSuggestionSelection,
} from "../../services/suggestion-service";

// Setup mock callback storage
const mockCommandCallbacks: Record<string, (...args: any[]) => any> = {};

beforeAll(() => {
  // Intercept command registrations and store callbacks
  (vscode.commands.registerCommand as jest.Mock).mockImplementation(
    (command: string, callback: (...args: any[]) => any) => {
      mockCommandCallbacks[command] = callback;
      return { dispose: jest.fn() };
    }
  );

  // Register commands (will populate `mockCommandCallbacks`)
  registerSuggestionCommands();
});

describe("Suggestion Commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock global state
    (isSuspended as any) = false;
    (suggestionContext as any) = {};
    (currentChoices as any) = [];
    (vscode.window as any).activeTextEditor = {};
  });

  describe("acceptSuggestion", () => {
    it("should do nothing if no active editor", async () => {
      (vscode.window as any).activeTextEditor = undefined;
  await mockCommandCallbacks["collabAgent.acceptInlineSuggestion"]();
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });

    it("should show information message when suspended", async () => {
      (isSuspended as any) = true;
  await mockCommandCallbacks["collabAgent.acceptInlineSuggestion"]();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Please hover over the suggestions and select the correct one manually",
        { modal: false }
      );
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });

    it("should commit suggestion and log event when not suspended", async () => {
  await mockCommandCallbacks["collabAgent.acceptInlineSuggestion"]();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "editor.action.inlineSuggest.commit"
      );
      expect(logSuggestionEvent).toHaveBeenCalledWith(true, suggestionContext);
      expect(resetSuggestionContext).toHaveBeenCalled();
    });

    it("should handle bugged suggestion review if context has bug", async () => {
      (suggestionContext as any) = {
        hasBug: true,
        prompt: "test",
        suggestions: [],
      };
  await mockCommandCallbacks["collabAgent.acceptInlineSuggestion"]();
      expect(handleBuggedSuggestionReview).toHaveBeenCalledWith(
        suggestionContext
      );
    });
  });

  describe("rejectSuggestion", () => {
    it("should do nothing if no active editor", async () => {
      (vscode.window as any).activeTextEditor = undefined;
  await mockCommandCallbacks["collabAgent.rejectInlineSuggestion"]();
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });

    it("should hide suggestion and log event", async () => {
  await mockCommandCallbacks["collabAgent.rejectInlineSuggestion"]();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "editor.action.inlineSuggest.hide"
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "hideSuggestWidget"
      );
      expect(logSuggestionEvent).toHaveBeenCalledWith(false, suggestionContext);
      expect(resetSuggestionContext).toHaveBeenCalled();
    });
  });

  describe("trackSuggestionSelection", () => {
    it("should log correct selection event", async () => {
      const choice = { isCorrect: true, text: "correct code" };
      await mockCommandCallbacks["clover.suggestionSelected"](choice);
      expect(logSuggestionEvent).toHaveBeenCalledWith(true, suggestionContext);
      expect(handleIncorrectSuggestionSelection).not.toHaveBeenCalled();
    });

    it("should handle incorrect selection", async () => {
      const choice = { isCorrect: false, text: "wrong code" };
      (currentChoices as any) = [
        { isCorrect: true, text: "right code" },
        choice,
      ];

      (suggestionContext as any).prompt = "example";

      await mockCommandCallbacks["clover.suggestionSelected"](choice);
      expect(logSuggestionEvent).toHaveBeenCalledWith(false, suggestionContext);
      expect(handleIncorrectSuggestionSelection).toHaveBeenCalledWith(
        "wrong code",
        "right code",
        "example"
      );
    });
  });
});
