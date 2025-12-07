import { USER_ENDPOINT } from "./types/endpoints";
import { User } from "./types/user";

/**
 * Fetches detailed user information by their unique ID.
 *
 * @param userID - The user's unique identifier.
 * @returns An object containing the user data or an error message.
 */
export async function getUserByID(
  userID: string
): Promise<{ user?: User; error?: string }> {
  try {
    const response = await fetch(`${USER_ENDPOINT}/${userID}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error:
          data.message ||
          `Failed to get user: ${response.status} ${response.statusText}`,
      };
    }

    if (!data.data) {
      return { error: "Invalid response: Missing user data" };
    }

    const userData = data.data;

    const user: User = {
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      isLocked: userData.is_locked,
      code_context_id: userData.code_context_id,
      auth_token: userID,
      isAuthenticated: true,
      userStatus: userData.status,
      role: userData.role,
      settings: userData.settings,
    };
    return { user: user };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
