import * as vscode from "vscode";
import * as SuggestionService from "../../services/suggestion-service";
import { registerSuggestionCommands } from "../../commands/suggestion-commands";
import { getAuthContext } from "../../services/auth-service";
import { getExplanation } from "../../api/suggestion-api";
import { createCodeComparisonWebview } from "../../views/CodeComparisonView";
import { UserStatus } from "../../api/types/user";
// import { SuggestionChoice } from "../../services/suggestion-service";

jest.mock("../../api/suggestion-api");
jest.mock("../../api/user-api");
jest.mock("../../services/auth-service");
jest.mock("../../utils");
jest.mock("../../utils/userClass");
jest.mock("../../views/notifications");
jest.mock("../../views/CodeComparisonView");

describe("#1 Context-Aware Code Suggestions", () => {
  const mockUser = {
    id: "user1",
    isAuthenticated: true,
    settings: { enable_quiz: true, bug_percentage: 0 },
    userStatus: UserStatus.ACTIVE,
  };

  const mockDocument = {
    getText: jest.fn().mockReturnValue("console.log('Hello');"),
    languageId: "javascript",
  } as unknown as vscode.TextDocument;

  const mockPosition = new vscode.Position(0, 20);
  const mockContext = {} as vscode.InlineCompletionContext;
  const mockToken = {} as vscode.CancellationToken;

  beforeEach(() => {
    jest.clearAllMocks();

    require("../../services/auth-service").getAuthContext.mockResolvedValue({ context: mockUser });

    require("../../api/user-api").getUserStatus.mockResolvedValue({
      data: UserStatus.ACTIVE,
    });

    require("../../utils/userClass").getSelectedClass.mockReturnValue({ id: "class1" });

    require("../../api/user-api").getUserSection.mockResolvedValue({
      userSectionId: "section123",
    });

    require("../../api/suggestion-api").fetchSuggestions.mockResolvedValue({
      suggestions: ["suggestion A", "suggestion B"],
    });

    require("../../api/suggestion-api").refinePrompt.mockResolvedValue({
      refinedPrompt: "Refined prompt",
    });

    require("../../api/suggestion-api").saveSuggestionToDatabase.mockResolvedValue({
      success: true,
      data: "suggestion-id-123",
    });

    require("../../utils").getSettings.mockReturnValue({
      model: "test-model",
      vendor: "test-vendor",
    });
  });

  it("triggers suggestion after debounce and updates suggestionContext", async () => {
    SuggestionService.setLastRequest(
      mockDocument,
      mockPosition,
      mockContext,
      mockToken
    );

    await new Promise<void>((resolve) => {
      SuggestionService.setDebounceTimeout((items) => {
        expect(items).toHaveLength(1);
        expect(items[0].insertText).toEqual("suggestion A");

        const ctx = SuggestionService.suggestionContext;
        expect(ctx.prompt).toContain("console.log");
        expect(ctx.suggestions).toEqual(["suggestion A", "suggestion B"]);
        expect(ctx.suggestionId).toBe("suggestion-id-123");
        resolve();
      });
    });
  }, 10000);
});

describe("Feedback After Selecting a Suggestion", () => {
  const prompt = "Add two numbers";
  const wrongCode = "return a - b;";
  const rightCode = "return a + b;";

  beforeEach(() => {
    jest.clearAllMocks();
    registerSuggestionCommands();

    (getAuthContext as jest.Mock).mockResolvedValue({
      context: { settings: { show_notifications: true } },
      error: null,
    });

    (getExplanation as jest.Mock).mockResolvedValue({
      success: true,
      data: "The subtraction is incorrect because it doesn't fulfill the intent.",
    });

    jest.spyOn(vscode.window, "showWarningMessage").mockResolvedValue({ title: "Show Explanation" } as vscode.MessageItem);
    (createCodeComparisonWebview as jest.Mock).mockClear(); // Clear call history for this mock
  });
  
//   it("shows feedback and explanation webview when incorrect suggestion is selected", async () => {
//     SuggestionService.currentChoices = [
//       { text: rightCode, isCorrect: true, index: 0 },
//       { text: wrongCode, isCorrect: false, index: 1 },
//     ];
//     SuggestionService.suggestionContext.prompt = prompt; // Also set the prompt

//     await vscode.commands.executeCommand("clover.suggestionSelected", {
//       isCorrect: false,
//       text: wrongCode,
//     });

//     console.log("showWarningMessage mock calls:", (vscode.window.showWarningMessage as jest.Mock).mock.calls);

//     expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
//       "That might not be the best solution. Consider reviewing the alternatives.",
//       "Show Explanation"
//     );

//     expect(getExplanation).toHaveBeenCalledWith({
//       prompt,
//       wrongCode,
//       rightCode,
//     });

//     expect(createCodeComparisonWebview).toHaveBeenCalledWith(
//       rightCode,
//       wrongCode,
//       expect.stringContaining("subtraction is incorrect")
//     );
//   });

  it("does not show feedback if user disables notifications", async () => {
    (getAuthContext as jest.Mock).mockResolvedValue({
      context: { settings: { show_notifications: false } },
      error: null,
    });

    await vscode.commands.executeCommand("clover.suggestionSelected", {
      isCorrect: false,
      text: wrongCode,
    });

    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    expect(getExplanation).not.toHaveBeenCalled();
    expect(createCodeComparisonWebview).not.toHaveBeenCalled();
  });
});