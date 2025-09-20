import { LogData, LogEvent } from "./types/event";
import { Result } from "./types/result";
import {
  HintRequest,
  IntervenedSuggestion,
  LineSuggestion,
  Suggestion,
} from "./types/suggestion";
import { getSettings } from "../utils/index";
import { trackEvent } from "./log-api";
import {
  AI_SUGGESTION_ENDPOINT,
  ANSWER_ENDPOINT,
  HINT_ENDPOINT,
  LOG_SUGGESTION_ENDPOINT,
  EXPLANATION_ENDPOINT,
  REFINE_PROMPT_ENDPOINT,
  LOG_LINE_SUGGESTION_ENDPOINT,
} from "./types/endpoints";

/**
 * Fetches AI-generated suggestions based on a given prompt.
 *
 * Logs the suggestion generation event with timing information.
 *
 * @param prompt - The user-provided prompt.
 * @returns A promise resolving to an array of suggestions or an error message.
 */
export async function fetchSuggestions(prompt: string): Promise<{
  suggestions?: string[];
  error?: string;
}> {
  try {
    const settings = getSettings();
    const startTime = Date.now();

    let elapsedTime = null;

    const vendor = settings["vendor"] || "google";
    const model = settings["model"] || "gemini-2.0-flash";

    if (!vendor || !model) {
      console.error("Invalid vendor or model:", vendor, model);
      return {
        error: "Invalid vendor or model",
      };
    }

    const response = await fetch(AI_SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        vendor,
        model,
        isIntervened: false,
      }),
    });

    const endTime = Date.now();
    elapsedTime = endTime - startTime;

    if (!response.ok) {
      return {
        error: `Error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.data) {
      return { error: "Invalid response: Missing suggestions" };
    }

    const suggestions = data.data?.response;
    if (!suggestions || suggestions.length === 0) {
      return { error: "No suggestions found" };
    }

    const logData: LogData = {
      event: LogEvent.MODEL_GENERATE,
      timeLapse: elapsedTime,
      metadata: {
        suggestions: suggestions,
        vendor,
        model,
      },
    };

    trackEvent(logData);

    return { suggestions };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Refines a raw user prompt to improve suggestion quality.
 *
 * @param rawPrompt - The original raw prompt text.
 * @returns A promise resolving to a refined prompt or an error.
 */
export async function refinePrompt(
  rawPrompt: string
): Promise<{ refinedPrompt?: string; error?: string }> {
  try {
    const response = await fetch(REFINE_PROMPT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawPrompt }),
    });

    const data = await response.json();

    const refinedPrompt = data?.data?.refinedPrompt;

    if (!response.ok || !refinedPrompt) {
      return {
        error: data.error || "Failed to refine prompt",
      };
    }

    return { refinedPrompt };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Prompt refinement failed",
    };
  }
}

/**
 * Saves an AI-generated suggestion to the backend database.
 *
 * @param suggestion - The suggestion metadata to save.
 * @returns A promise resolving to the result of the operation.
 */
export async function saveSuggestionToDatabase(
  suggestion: Suggestion
): Promise<Result<string>> {
  const body = JSON.stringify(suggestion);

  try {
    const response = await fetch(LOG_SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      status: response.status,
      success: true,
      data: result.data as string,
    };
  } catch (error: any) {
    console.error("Error saving suggestion: ", error);
    return {
      status: 500,
      success: false,
      error: error.message,
    };
  }
}

export async function updateSuggestionInDatabase(
  suggestionId: string,
  update: { prompt?: string; userSectionId?: string }
) {
  try {
    const response = await fetch(`${LOG_SUGGESTION_ENDPOINT}/${suggestionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error(
        `Update failed: ${response.status} ${response.statusText}`
      );
    }

    return { status: response.status, success: true };
  } catch (err: any) {
    console.error("Error updating suggestion:", err);
    return { status: 500, success: false, error: err.message };
  }
}

export async function logLineSuggestionToDatabase(
  suggestion: Omit<LineSuggestion, "id">
): Promise<Result<string>> {
  try {
    const response = await fetch(LOG_LINE_SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestion),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return {
      status: response.status,
      success: true,
      data: result.data as string,
    };
  } catch (error: any) {
    console.error("Error logging line suggestion:", error);
    return {
      status: 500,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retrieves a hint to help the user correct a buggy code suggestion.
 *
 * @param request - The hint request payload (prompt, wrong code, right code).
 * @returns A promise resolving to the retrieved hint or an error.
 */
export async function getHint(request: HintRequest): Promise<Result<string>> {
  const body = JSON.stringify(request);

  try {
    const response = await fetch(HINT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result || !result.data) {
      throw new Error("Invalid response from server");
    }

    const { data } = result;

    return {
      status: response.status,
      success: true,
      data: data.hint as string,
    };
  } catch (error: any) {
    console.error("Error getting hint: ", error);
    return {
      status: 500,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Retrieves a detailed explanation of why a suggestion may be incorrect.
 *
 * @param request - The explanation request payload (prompt, wrong code, right code).
 * @returns A promise resolving to the retrieved explanation or an error.
 */
export async function getExplanation(
  request: HintRequest
): Promise<Result<string>> {
  const body = JSON.stringify(request);

  console.log(JSON.stringify(request, null, 2));

  try {
    const response = await fetch(EXPLANATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result || !result.data) {
      throw new Error("Invalid response from server");
    }

    const { data } = result;

    return {
      status: response.status,
      success: true,
      data: data.explanation as string,
    };
  } catch (error: any) {
    console.error("Error getting explanation: ", error);
    return {
      status: 500,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Submits a user's corrected code against a buggy suggestion to verify correctness.
 *
 * @param wrongCode - The original buggy code.
 * @param fixedCode - The user's corrected version of the code.
 * @param prompt - The original prompt for context.
 * @returns A promise resolving to `true` if the fix is correct, otherwise `false`.
 */
export async function submitCode(
  wrongCode: string,
  fixedCode: string,
  prompt: string
): Promise<boolean> {
  try {
    const response = await fetch(ANSWER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        wrongCode,
        fixedCode,
        prompt,
      }),
    });

    const data = await response.json();

    return data.data.isCorrect;
  } catch (error) {
    console.error("Error submitting fix:", error);
    return false;
  }
}

let intervenedCache: IntervenedSuggestion[] = [];
let intervenedIndex = 0;

export function resetIntervenedCache() {
  intervenedCache = [];
  intervenedIndex = 0;
}

export async function fetchIntervenedSuggestions(prompt: string): Promise<{
  suggestion?: IntervenedSuggestion;
  suggestionItems?: IntervenedSuggestion[];
  intervenedIndex?: number;
  error?: string;
}> {
  let index: number;

  if (intervenedCache.length > 0) {
    if (intervenedIndex < intervenedCache.length) {
      const suggestion = intervenedCache[intervenedIndex];

      index = intervenedIndex;

      intervenedIndex++;

      if (intervenedIndex >= intervenedCache.length) {
        intervenedCache = [];
        intervenedIndex = 0;
      }

      console.log("Fetching from CACHE");

      return {
        suggestion,
        suggestionItems: intervenedCache,
        intervenedIndex: index,
      };
    }

    intervenedCache = [];
    intervenedIndex = 0;
  }

  const settings = getSettings();
  const startTime = Date.now();

  let elapsedTime = null;

  const vendor = settings["vendor"] || "google";
  const model = settings["model"] || "gemini-2.0-flash";

  if (!vendor || !model) {
    console.error("Invalid vendor or model:", vendor, model);
    return {
      error: "Invalid vendor or model",
    };
  }

  const response = await fetch(AI_SUGGESTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      vendor: settings.vendor || "google",
      model: settings.model || "gemini-2.0-flash",
      isIntervened: true,
    }),
  });

  const endTime = Date.now();
  elapsedTime = endTime - startTime;

  if (!response.ok) {
    return { error: `Error: ${response.status} ${response.statusText}` };
  }

  const data = await response.json();
  if (!data.data?.response?.length) {
    return { error: "No intervened suggestions found" };
  }

  intervenedCache = data.data.response;
  intervenedIndex = 0;
  index = intervenedIndex;

  const logData: LogData = {
    event: LogEvent.MODEL_GENERATE,
    timeLapse: elapsedTime,
    metadata: {
      suggestions: intervenedCache,
      vendor,
      model,
    },
  };

  trackEvent(logData);

  const suggestion = intervenedCache[intervenedIndex];
  intervenedIndex++;

  console.log("Fetching from NEW");

  return {
    suggestion,
    suggestionItems: intervenedCache,
    intervenedIndex: index,
  };
}
