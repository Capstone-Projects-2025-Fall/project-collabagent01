import { AUTH_ENDPOINT } from "./endpoints";
import { UserData } from "./types/user";

/**
 * Function to log in a user
 * TODO: Wrap this in a try-catch block to match other api functions
 * @param {string} firstName - The first name of the user
 * @param {string} lastName - The last name of the user
 * @param {string} email - The email of the user
 * @param {string} password - The password of the user
 * @returns {Promise<{ data?: any; error?: string }>} - The response from the server or an error message
 * @throws {Error} - Throws an error if the request fails
 */
export async function registerUser(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<{ userData?: UserData; error?: string }> {
  try {
    const response = await fetch(`${AUTH_ENDPOINT}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message };
    }

    return { userData: data as UserData };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}
