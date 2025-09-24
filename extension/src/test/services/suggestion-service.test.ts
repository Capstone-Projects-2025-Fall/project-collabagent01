import * as vscode from "vscode";
import {
  resetSuggestionContext,
  getPromptText,
  setDebounceTimeout,
  setLastRequest,
  handleSuggestionRequest,
  buildCompletionItems,
  handleBuggedSuggestionReview,
  handleIncorrectSuggestionSelection,
  suggestionContext,
  currentChoices,
  suggestionsToReview,
  resetDebounceTimeout,
} from "../../services/suggestion-service";
import {
  fetchSuggestions,
  refinePrompt,
  saveSuggestionToDatabase,
  getExplanation,
} from "../../api/suggestion-api";
import { getAuthContext } from "../../services/auth-service";
import { getUserStatus, getUserSection } from "../../api/user-api";
import { User, UserStatus } from "../../api/types/user";
import { getSettings, hasBugRandomly } from "../../utils";
import { getSelectedClass } from "../../utils/userClass";
import { authNotification, errorNotification } from "../../views/notifications";
import { createCodeComparisonWebview } from "../../views/CodeComparisonView";

jest.mock("vscode", () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn(),
    registerUriHandler: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  env: {
    openExternal: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
  languages: {
    registerInlineCompletionItemProvider: jest.fn(),
    registerCodeActionsProvider: jest.fn(),
  },
  Position: jest
    .fn()
    .mockImplementation((line, char) => ({ line, character: char })),
  Range: jest.fn(),
  InlineCompletionItem: jest.fn().mockImplementation((text) => ({ text })),
  Uri: {
    parse: jest.fn(),
  },
}));

jest.mock("../../api/suggestion-api");
jest.mock("../../services/auth-service");
jest.mock("../../api/user-api");
jest.mock("../../utils");
jest.mock("../../utils/userClass");
jest.mock("../../views/notifications");
jest.mock("../../views/CodeComparisonView");
jest.mock("../../views/CodeCorrectionView");

describe("Suggestion Service", () => {
  let mockDocument: vscode.TextDocument;
  let mockPosition: vscode.Position;
  let mockContext: vscode.InlineCompletionContext;
  let mockToken: vscode.CancellationToken;
  let mockResolve: jest.Mock;

  const testUser: User = {
    id: "123",
    email: "test@example.com",
    isAuthenticated: true,
    isLocked: false,
    userStatus: UserStatus.ACTIVE,
    role: "admin",
    settings: {
      bug_percentage: 10,
      show_notifications: true,
      give_suggestions: false,
      enable_quiz: true,
      active_threshold: 5,
      suspend_threshold: 10,
      pass_rate: 80,
      suspend_rate: 30,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSuggestionContext();

    // Setup VS Code mocks
    mockDocument = {
      languageId: "javascript",
      getText: jest.fn().mockReturnValue("const x = 1;"),
      positionAt: jest.fn(),
      offsetAt: jest.fn().mockImplementation((pos: vscode.Position) => {
        // naive offset: line 0, so just return character
        return pos.character;
      }),
    } as unknown as vscode.TextDocument;

    mockPosition = new vscode.Position(0, 10);
    mockContext = {} as vscode.InlineCompletionContext;
    mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
    mockResolve = jest.fn();

    // Mock API responses
    (fetchSuggestions as jest.Mock).mockResolvedValue({
      suggestions: ["const y = 2;", "const z = 3;"],
      error: null,
    });

    (refinePrompt as jest.Mock).mockResolvedValue({
      refinedPrompt: "refined prompt",
    });

    (saveSuggestionToDatabase as jest.Mock).mockResolvedValue({
      success: true,
      data: "suggestion-id-123",
    });

    (getAuthContext as jest.Mock).mockResolvedValue({
      context: testUser,
      error: null,
    });

    (getUserStatus as jest.Mock).mockResolvedValue({
      data: UserStatus.ACTIVE,
      error: null,
    });

    (getUserSection as jest.Mock).mockResolvedValue({
      userSectionId: "section-123",
    });

    (getSettings as jest.Mock).mockReturnValue({
      model: "test-model",
      vendor: "test-vendor",
    });

    (hasBugRandomly as jest.Mock).mockReturnValue(false);
    (getSelectedClass as jest.Mock).mockReturnValue({
      id: "class-123",
      name: "Test Class",
    });

    // Mock VS Code window methods
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
      undefined
    );
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  describe("Core Functions", () => {
    it("should get prompt text correctly", () => {
      const prompt = getPromptText(mockDocument, mockPosition);
      expect(prompt).toContain("Language javascript. Prompt:");
      expect(prompt).toContain("const x = ");
      expect(prompt).toContain("# <<<FILL_HERE>>>");
      expect(prompt).toContain("1;");
      expect(mockDocument.getText).toHaveBeenCalled();
    });

    it("should reset suggestion context", () => {
      (suggestionContext as any).prompt = "test";
      suggestionsToReview.push("test");

      resetSuggestionContext();

      expect(suggestionContext.prompt).toBeUndefined();
      expect(suggestionsToReview.length).toBe(0);
    });
  });

  describe("Debounce Functions", () => {
    it("should reset debounce timer", async () => {
      jest.useFakeTimers();
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      setDebounceTimeout(jest.fn());

      // Allow getAuthenticatedUser().then(...) to resolve and set the timeout
      await Promise.resolve();
      await Promise.resolve();

      resetDebounceTimeout();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe("Suggestion Handling", () => {
    it("should handle suggestion request successfully", async () => {
      setLastRequest(mockDocument, mockPosition, mockContext, mockToken);

      await handleSuggestionRequest(
        testUser,
        {
          document: mockDocument,
          position: mockPosition,
          context: mockContext,
          token: mockToken,
        },
        false,
        mockResolve
      );

      expect(fetchSuggestions).toHaveBeenCalled();
      expect(mockResolve).toHaveBeenCalled();
      expect(suggestionContext.suggestionId).toBe("suggestion-id-123");
    });

    it("should build completion items for normal user", async () => {
      const items = await buildCompletionItems(
        ["suggestion1", "suggestion2"],
        false,
        false
      );
      expect(items.length).toBe(1);
    });

    it("should build completion items for suspended user", async () => {
      const items = await buildCompletionItems(
        ["suggestion1", "suggestion2"],
        false,
        true
      );
      expect(items.length).toBe(3); // Instruction + 2 choices
      expect(currentChoices.length).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle failed suggestion fetch", async () => {
      (fetchSuggestions as jest.Mock).mockResolvedValue({
        suggestions: null,
        error: "API Error",
      });

      await handleSuggestionRequest(
        testUser,
        {
          document: mockDocument,
          position: mockPosition,
          context: mockContext,
          token: mockToken,
        },
        false,
        mockResolve
      );

      expect(errorNotification).toHaveBeenCalled();
    });
  });

  // describe("Review Flows", () => {
  //   it("should handle bugged suggestion review", async () => {
  //     (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
  //       "Review Code"
  //     );
  //     (getExplanation as jest.Mock).mockResolvedValue({
  //       success: true,
  //       data: "explanation",
  //     });

  //     await handleBuggedSuggestionReview(
  //       "test-prompt",
  //       ["right-code", "wrong-code"],
  //       {
  //         prompt: "test",
  //         suggestions: ["s1", "s2"],
  //         suggestionId: "test-id",
  //         hasBug: true,
  //         startTime: Date.now(),
  //       }
  //     );

  //     expect(createCodeComparisonWebview).toHaveBeenCalled();
  //   });

  //   it("should handle incorrect suggestion selection", async () => {
  //     (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
  //       "Show Explanation"
  //     );
  //     (getExplanation as jest.Mock).mockResolvedValue({
  //       success: true,
  //       data: "explanation",
  //     });

  //     await handleIncorrectSuggestionSelection(
  //       "test-prompt",
  //       "wrong-code",
  //       "right-code"
  //     );

  //     expect(createCodeComparisonWebview).toHaveBeenCalled();
  //   });
  // });
});
