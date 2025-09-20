import { AUTH_ENDPOINT } from "./types/endpoints";

/**
 * Signs in a user using their email and password credentials.
 *
 * Sends a POST request to the authentication endpoint to validate credentials.
 *
 * @param email - The user's email address.
 * @param password - The user's password.
 * @returns An object containing either the user token on success, or an error message on failure.
 */
export async function signIn(
    email: string,
    password: string
): Promise<{token?: string; error?: string}> {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}/login?provider=email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password
            }),
        });
        const data = await response.json();
    
        if (!response.ok || !data.data) {
            return { error: data.message || `Failed to Sign in: ${response.status} ${response.statusText}` };
        }

        return data.data;
    } catch (err) {
        console.error("Error signing in:", err);
        return { error: err instanceof Error ? err.message : "Unknown error occurred" };
    }

}


/**
 * Signs out a user by invalidating their session on the backend.
 *
 * Sends a POST request to the signout endpoint with the user's ID.
 *
 * @param userID - The user's unique ID.
 * @returns An object indicating success or containing an error message.
 */
export async function signOut(userID: string): Promise<{ error?: string }> {
    try {
        const response = await fetch(`${AUTH_ENDPOINT}/signout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userID,
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            return { error: data.message || `Failed to sign out: ${response.status} ${response.statusText}` };
        }

        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Unknown error occurred" };
    }
}


/**
 * Registers a new user with the provided email, password, and name information.
 *
 * Sends a POST request to the signup endpoint to create a new user account.
 *
 * @param email - The user's email address.
 * @param password - The user's password.
 * @param firstName - The user's first name.
 * @param lastName - The user's last name.
 * @returns An object containing either the user token on success, or an error message on failure.
 */
export async function signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string
): Promise<{token?: string, error?: string}> {
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
                last_name: lastName
            }),
        });
    
        const data = await response.json();
    
        if (!response.ok || !data.data) {
            throw new Error(data.error || "Failed to sign up");
        }
    
        return { token: data.data.token };
    } catch(err) {
        console.error("Error signing up:", err);
        return { error: err instanceof Error ? err.message : "Unknown error occurred" };
    }
    
}