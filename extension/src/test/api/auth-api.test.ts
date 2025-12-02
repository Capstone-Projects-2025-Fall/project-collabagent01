/**
 * Tests for auth-api.ts
 */

import { signIn, signOut, signUp } from "../../api/auth-api";
import { AUTH_ENDPOINT } from "../../api/types/endpoints";

// --- Mock global fetch ---
global.fetch = jest.fn();

// Utility to reset fetch between tests
const mockFetch = global.fetch as jest.Mock;

describe("auth-api", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ----------------------------
    // signIn
    // ----------------------------
    describe("signIn", () => {
        test("returns token on successful login", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: { token: "abc123" }
                }),
            });

            const result = await signIn("test@example.com", "password123");

            expect(result.token).toBe("abc123");
            expect(mockFetch).toHaveBeenCalledWith(
                `${AUTH_ENDPOINT}/login?provider=email`,
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "test@example.com",
                        password: "password123",
                    }),
                })
            );
        });

        test("returns error when response.ok is false", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: "Unauthorized",
                json: async () => ({ message: "Invalid credentials" }),
            });

            const result = await signIn("bad@example.com", "wrongpass");
            expect(result.error).toContain("Invalid credentials");
        });

        test("returns error when data.data is missing", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: "Missing data" }),
            });

            const result = await signIn("no@data.com", "pass");
            expect(result.error).toContain("Missing data");
        });

        test("catches fetch/network error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network failure"));

            const result = await signIn("x@y.com", "pw");
            expect(result.error).toBe("Network failure");
        });

        test("handles non-Error thrown values", async () => {
            mockFetch.mockRejectedValueOnce("weird error");

            const result = await signIn("x@y.com", "pw");
            expect(result.error).toBe("Unknown error occurred");
        });
    });

    // ----------------------------
    // signOut
    // ----------------------------
    describe("signOut", () => {
        test("returns success object on valid signout", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: "Signed out" }),
            });

            const result = await signOut("user123");
            expect(result.error).toBeUndefined();
        });

        test("returns error if backend rejects", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: "Server Error",
                json: async () => ({ message: "Internal failure" }),
            });

            const result = await signOut("user123");
            expect(result.error).toContain("Internal failure");
        });

        test("returns error on network exception", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network down"));

            const result = await signOut("user123");
            expect(result.error).toBe("Network down");
        });
    });

    // ----------------------------
    // signUp
    // ----------------------------
    describe("signUp", () => {
        test("returns token on successful signup", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: { token: "new-token-123" }
                }),
            });

            const result = await signUp("a@b.com", "pass", "Nick", "Phillips");
            expect(result.token).toBe("new-token-123");

            expect(mockFetch).toHaveBeenCalledWith(
                `${AUTH_ENDPOINT}/signup`,
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "a@b.com",
                        password: "pass",
                        first_name: "Nick",
                        last_name: "Phillips",
                    }),
                })
            );
        });

        test("throws → catch block returns formatted error when backend fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    error: "Email already exists"
                }),
            });

            const result = await signUp("x@y.com", "pw", "John", "Doe");
            expect(result.error).toBe("Email already exists");
        });

        test("handles missing data.data safely", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bad: "format" }),
            });

            const result = await signUp("x@y.com", "pw", "John", "Doe");
            expect(result.error).toBe("Failed to sign up");
        });

        test("handles network error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network fail"));

            const result = await signUp("x@y.com", "pw", "John", "Doe");
            expect(result.error).toBe("Network fail");
        });

        test("handles non-Error thrown values", async () => {
            mockFetch.mockRejectedValueOnce("weird");

            const result = await signUp("x@y.com", "pw", "John", "Doe");
            expect(result.error).toBe("Unknown error occurred");
        });
    });
});
