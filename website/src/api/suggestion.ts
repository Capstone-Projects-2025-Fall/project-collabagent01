import { CodeSuggestion } from "./types/suggestion";
import { AI_SUGGESTION_ENDPOINT } from "./endpoints";

/**
 * Fetches a suggestion by its ID.
 * @param {string} suggestionId - The ID of the suggestion to fetch.
 * @returns {Promise<{ data?: CodeSuggestion; error?: string }>} - The response from the server or an error message.
 */
export async function getSuggestionById(
  suggestionId: string
): Promise<{ data?: CodeSuggestion; error?: string }> {
  try {
    const response = await fetch(`${AI_SUGGESTION_ENDPOINT}/${suggestionId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to get suggestion data: ${response.status} ${response.statusText}`,
      };
    }

    if (!data.data) {
      return { error: "Invalid response: expected suggestion data" };
    }

    return {
      data: {
        id: data.data.id,
        createdAt: data.data.created_at,
        hasBug: data.data.has_bug,
        suggestionArray: data.data.suggestion_array,
        model: data.data.model,
        prompt: data.data.prompt,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
