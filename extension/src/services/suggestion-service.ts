import * as vscode from "vscode";
import {
  IntervenedSuggestion,
  LineSuggestion,
  SuggestionContext,
} from "../api/types/suggestion";
import {
  fetchIntervenedSuggestions,
  fetchSuggestions,
  logLineSuggestionToDatabase,
  refinePrompt,
  updateSuggestionInDatabase,
} from "../api/suggestion-api";
import { getAuthContext } from "./auth-service";
import { getUserStatus } from "../api/user-api";
import { User, UserStatus } from "../api/types/user";
import { handleSignIn } from "./auth-service";
import { getHint, getExplanation } from "../api/suggestion-api";
import { createCodeCorrectionWebview } from "../views/CodeCorrectionView";
import { createCodeComparisonWebview } from "../views/CodeComparisonView";
import { HintRequest } from "../api/types/suggestion";
import { getSettings, hasBugRandomly } from "../utils";
import { getUserSection } from "../api/user-api";
import { saveSuggestionToDatabase } from "../api/suggestion-api";
import { Suggestion } from "../api/types/suggestion";
import { authNotification, errorNotification } from "../views/notifications";
import { getSelectedClass } from "../utils/userClass";

/**
 * Represents a suggestion choice for users to select during suspended states.
 */
export type SuggestionChoice = {
  text: string;
  isCorrect: boolean;
  index: number;
};

export let currentChoices: SuggestionChoice[] = [];

/**
 * Stores buggy suggestions that the user needs to review.
 */
export let suggestionsToReview: string[] = [];

/**
 * Timeout reference used for debouncing typing activity.
 */
let debounceTimer: NodeJS.Timeout | null = null;

// /**
//  * Time (ms) to wait after typing stops before triggering a suggestion request.
//  */
// const TYPING_PAUSE_THRESHOLD = 1000;

/**
 * Represents the most recent text document and cursor information for generating suggestions.
 */
type LastRequest = {
  document: vscode.TextDocument;
  position: vscode.Position;
  context: vscode.InlineCompletionContext;
  token: vscode.CancellationToken;
} | null;

let lastRequest: LastRequest = null;

/**
 * Contextual metadata for the currently active suggestion flow.
 */
export let suggestionContext: SuggestionContext = {
  prompt: "",
  suggestions: [],
  intervenedSuggestions: [],
  suggestionId: "",
  hasBug: false,
  startTime: 0,
};
export let isSuspended: boolean;

/**
 * Extracts the prompt text from the start of the document up to the cursor position.
 *
 * @param document - The active text document.
 * @param position - The current cursor position.
 * @returns The extracted prompt text including the programming language.
 */
export const getPromptText = (
  document: vscode.TextDocument,
  position: vscode.Position
): string => {
  const language = document.languageId;

  const fullText = document.getText();

  const cursorOffset = document.offsetAt(position);
  const before = fullText.slice(0, cursorOffset);
  const after = fullText.slice(cursorOffset);

  const prompt = `${before}# <<<FILL_HERE>>>\n${after}`;

  return `Language ${language}. Prompt:\n${prompt}`;
};

/**
 * Resets the suggestion context and clears any pending review suggestions.
 */
export const resetSuggestionContext = () => {
  suggestionContext = {
    suggestions: [],
    intervenedSuggestions: [],
    suggestionId: "",
    hasBug: false,
    startTime: 0,
  };
  suggestionsToReview = [];
};

/**
 * Clears the active debounce timer, if it exists.
 */
export const resetDebounceTimeout = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};

export let lastSuggestionDurationMs: number = 0;

/**
 * Sets a new debounce timer to trigger an inline suggestion request after user pauses typing.
 *
 * @param resolve - Function to resolve with generated InlineCompletionItems.
 */
export const setDebounceTimeout = (
  resolve: (items: vscode.InlineCompletionItem[]) => void
) => {
  let typingPause = 1000;

  getAuthenticatedUser().then(async (user) => {
    if (!user) {
      await authNotification();
      return;
    }

    typingPause = user.settings.intervened ? 500 : 700;

    debounceTimer = setTimeout(async () => {
      const requestStart = performance.now();

      if (shouldSkipSuggestion()) {
        return;
      }

      const status = await getAndHandleUserStatus(user.id);
      if (status === null) {
        return;
      }

      isSuspended = status === UserStatus.SUSPENDED;

      if (lastRequest) {
        await handleSuggestionRequest(
          user,
          lastRequest,
          isSuspended,
          (items) => {
            lastSuggestionDurationMs = performance.now() - requestStart;
            console.log(
              `Suggestion duration: ${lastSuggestionDurationMs.toFixed(1)} ms`
            );
            resolve(items);
          }
        );
      }
    }, typingPause);
  });
};

/**
 * Stores the latest document, position, and request context.
 *
 * @param document - The active text document.
 * @param position - The cursor position within the document.
 * @param context - Inline suggestion request context.
 * @param token - Cancellation token for the request.
 */
export const setLastRequest = (
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.InlineCompletionContext,
  token: vscode.CancellationToken
) => {
  lastRequest = { document, position, context, token };
};

/**
 * Checks if suggestions should be skipped due to pending review.
 *
 * @returns `true` if there are suggestions to review; otherwise, `false`.
 */
function shouldSkipSuggestion(): boolean {
  return suggestionsToReview.length > 0;
}

/**
 * Retrieves the currently authenticated user, triggering sign-in if necessary.
 *
 * @returns The authenticated user object, or `null` if authentication fails.
 */
async function getAuthenticatedUser(): Promise<any | null> {
  const { context: user, error } = await getAuthContext();
  if (error || user === undefined) {
    await errorNotification(`Failed to get user context: ${error}`);
    return null;
  }

  if (!user.isAuthenticated) {
    const selection = await vscode.window.showInformationMessage(
      "You are not authenticated. Please sign in to track your progress!",
      "Sign In"
    );

    if (selection === "Sign In") {
      handleSignIn();
    }

    return null;
  }

  return user;
}

/**
 * Retrieves and handles the user's current suggestion status (e.g., LOCKED or ACTIVE).
 *
 * @param userId - The user's unique ID.
 * @returns The user's status or `null` if retrieval fails.
 */
async function getAndHandleUserStatus(
  userId: string
): Promise<UserStatus | null> {
  const selectedClass = getSelectedClass();
  const { data: userStatus, error: statusError } = await getUserStatus(
    userId,
    selectedClass?.id
  );

  if (statusError) {
    await errorNotification(`Failed to get user status: ${statusError}`);
    return null;
  }

  const { context: user, error: authError } = await getAuthContext();
  if (authError || user === undefined) {
    await errorNotification(`Failed to get user context: ${authError}`);
    return null;
  }

  if (!user.settings.enable_quiz) {
    return UserStatus.ACTIVE;
  }

  const status = userStatus ?? user.userStatus;

  if (status === UserStatus.LOCKED) {
    if (user.settings.show_notifications) {
      const selection = await vscode.window.showInformationMessage(
        "Your suggestions are locked. Please review your progress to unlock it.",
        "Review",
        "Ignore"
      );

      if (selection === "Review") {
        vscode.env.openExternal(
          vscode.Uri.parse("https://clover.nickrucinski.com/")
        );
      }
    }
  }
  if (status !== undefined) {
    return status;
  }
  return null;
}

/**
 * Handles fetching and processing a suggestion request, updating the suggestion context.
 *
 * @param user - The authenticated user.
 * @param request - The last typing request context.
 * @param isSuspended - Whether the user is currently suspended.
 * @param resolve - Function to resolve with InlineCompletionItems.
 */
export async function handleSuggestionRequest(
  user: User,
  request: LastRequest,
  isSuspended: boolean,
  resolve: (items: vscode.InlineCompletionItem[]) => void
) {
  if (!request) {
    return;
  }

  const prompt = getPromptText(request.document, request.position);
  if (!prompt || prompt.trim() === "") {
    return;
  }

  if (user.settings.intervened) {
    const { suggestion, suggestionItems, intervenedIndex, error } =
      await fetchIntervenedSuggestions(prompt);

    if (error || !suggestion) {
      await errorNotification(`Failed to get intervened suggestions: ${error}`);
      return;
    }

    suggestionContext = {
      prompt,
      intervenedSuggestions: [suggestion],
      suggestions: [],
      hasBug: suggestion.hasBug,
      suggestionId: "",
      startTime: Date.now(),
    };

    (async () => {
      try {
        const lineSuggestion: Omit<LineSuggestion, "id"> = {
          mainLine: suggestion.mainLine,
          fixedLine: suggestion.fixedLine || "",
          hasBug: suggestion.hasBug,
          lineIndex: intervenedIndex || 0,
          suggestionItems: suggestionItems ?? null,
        };

        const result = await logLineSuggestionToDatabase(lineSuggestion);
        if (result.success) {
          suggestionContext.suggestionId = result.data;
          console.log("Id is ", result.data);
        }
      } catch (err) {
        console.warn("Background line-suggestion logging failed:", err);
      }
    })();

    const completionItems = await buildIntervenedCompletionItems(suggestion);
    resolve(completionItems);
    return;
  } else {
    const { suggestions, error } = await fetchSuggestions(prompt);

    if (error || !suggestions?.length) {
      await errorNotification(`Failed to get code-block suggestions: ${error}`);
      return;
    }

    const hasBug = hasBugRandomly(user.settings.bug_percentage);

    const suggestion: Suggestion = {
      id: "",
      prompt,
      suggestionArray: suggestions as string[],
      hasBug,
      model: getSettings()["model"],
      vendor: getSettings()["vendor"],
      userSectionId: "",
    };

    const result = await saveSuggestionToDatabase(suggestion);

    if (!result.success) {
      await errorNotification("Failed to save suggestion");
      return;
    }

    const suggestionId = result.data;

    suggestionContext = {
      prompt,
      suggestions,
      hasBug,
      suggestionId: suggestionId,
      startTime: Date.now(),
    };

    (async () => {
      try {
        const selectedClass = getSelectedClass();
        const [userSection, { refinedPrompt }] = await Promise.all([
          getUserSection(user.id, selectedClass?.id),
          refinePrompt(prompt),
        ]);

        await updateSuggestionInDatabase(suggestionId, {
          prompt: refinedPrompt,
          userSectionId: userSection.userSectionId,
        });
      } catch (err) {
        console.warn("Background metadata/save failed:", err);
      }
    })();

    const completionItems = await buildCompletionItems(
      suggestions,
      hasBug,
      isSuspended
    );

    resolve(completionItems);
    return;
  }
}

export async function buildIntervenedCompletionItems(
  intervened: IntervenedSuggestion
): Promise<vscode.InlineCompletionItem[]> {
  const item = new vscode.InlineCompletionItem(intervened.mainLine);
  return [item];
}

/**
 * Builds the inline completion items based on fetched suggestions.
 *
 * @param suggestions - List of generated suggestions.
 * @param hasBug - Whether the suggestion intentionally contains a bug.
 * @param isSuspended - Whether the user is suspended and requires manual review.
 * @returns An array of InlineCompletionItems for VS Code.
 */
export async function buildCompletionItems(
  suggestions: string[],
  hasBug: boolean,
  isSuspended: boolean
): Promise<vscode.InlineCompletionItem[]> {
  const items: vscode.InlineCompletionItem[] = [];

  if (isSuspended) {
    const instructionItem = new vscode.InlineCompletionItem(
      "⚠️ Please hover and select the correct answer below"
    );
    items.push(instructionItem);

    const correctChoice = {
      text: suggestions[0],
      isCorrect: true,
      index: 0,
    };
    const incorrectChoice = {
      text: suggestions[1],
      isCorrect: false,
      index: 1,
    };
    currentChoices = [correctChoice, incorrectChoice];

    const shuffled = [correctChoice, incorrectChoice].sort(
      () => Math.random() - 0.5
    );
    shuffled.forEach((choice) => {
      const item = new vscode.InlineCompletionItem(choice.text);
      item.command = {
        command: "clover.suggestionSelected",
        title: "Track Suggestion Selection",
        arguments: [choice],
      };
      items.push(item);
    });
  } else {
    const selected = hasBug ? suggestions[1] : suggestions[0];
    items.push(new vscode.InlineCompletionItem(selected));
  }

  return items;
}

/**
 * Handles prompting the user to review buggy suggestions and opens appropriate review views.
 *
 * @param prompt - The original prompt text.
 * @param suggestions - The list of suggestions returned.
 * @param context - Contextual metadata for the suggestion.
 */
export async function handleBuggedSuggestionReview(context: SuggestionContext) {
  const { suggestions, prompt } = context;

  if (!suggestions || suggestions.length < 2) {
    await errorNotification("Missing regular suggestions to review.");
    return;
  }

  suggestionsToReview = suggestions as string[];
  const rightCode = suggestions[0];
  const wrongCode = suggestions[1];

  const { context: user, error } = await getAuthContext();
  if (error || user === undefined) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }

  if (!user.settings.show_notifications) {
    return;
  }
  const selection = await vscode.window.showWarningMessage(
    "Warning: The accepted suggestion may contain a bug. Please review the code carefully.",
    { modal: false },
    "Review Code",
    "Correct Code",
    "Ignore"
  );

  const request: HintRequest = {
    wrongCode,
    rightCode,
    prompt,
  };

  if (selection === "Review Code") {
    const result = await getExplanation(request);
    if (!result.success) {
      await errorNotification("Failed to get explanation from backend.");
      return;
    }
    createCodeComparisonWebview(rightCode, wrongCode, result.data);
  } else if (selection === "Correct Code") {
    const result = await getHint(request);
    const hint = result.success && result.data;
    if (!hint) {
      await errorNotification("Failed to get hint from backend.");
      return;
    }

    createCodeCorrectionWebview(wrongCode, hint, context);
  }
}

/**
 * Handles user selections that may indicate an incorrect suggestion was chosen.
 *
 * @param prompt - The original user prompt.
 * @param wrongCode - The incorrect suggestion chosen.
 * @param rightCode - The correct suggestion.
 */
export async function handleIncorrectSuggestionSelection(
  wrongCode: string,
  rightCode: string,
  prompt?: string
) {
  const { context: user, error } = await getAuthContext();
  if (error || user === undefined) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }

  if (!user.settings.show_notifications) {
    return;
  }

  const selection = await vscode.window.showWarningMessage(
    "That might not be the best solution. Consider reviewing the alternatives.",
    "Show Explanation"
  );

  if (selection === "Show Explanation") {
    const request: HintRequest = { prompt, wrongCode, rightCode };
    const result = await getExplanation(request);
    if (result.success) {
      createCodeComparisonWebview(rightCode, wrongCode, result.data);
    } else {
      await errorNotification("Failed to get explanation from backend.");
    }
  }
}
