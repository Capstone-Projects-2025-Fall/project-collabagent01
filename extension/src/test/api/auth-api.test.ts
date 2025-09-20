import { AUTH_ENDPOINT } from "../../api/types/endpoints";
import { signIn, signOut, signUp } from "../../api/auth-api";

// Mock the global fetch
global.fetch = jest.fn() as jest.Mock;

describe("Auth API", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    const mockEmail = "test@example.com";
    const mockPassword = "securePassword123";

    it("should return token on successful login", async () => {
      const mockToken = "mock-jwt-token";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { token: mockToken } }),
      } as Response);

      const result = await signIn(mockEmail, mockPassword);
      expect(result.token).toBe(mockToken);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `${AUTH_ENDPOINT}/login?provider=email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: mockEmail, password: mockPassword }),
        }
      );
    });

    it("should handle failed login with message", async () => {
      const errorMessage = "Invalid credentials";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: errorMessage }),
      } as Response);

      const result = await signIn(mockEmail, mockPassword);
      expect(result.error).toBe(errorMessage);
      expect(result.token).toBeUndefined();
    });

    it("should handle missing data in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.resolve({}),
      } as Response);

      const result = await signIn(mockEmail, mockPassword);
      expect(result.error).toBe("Failed to Sign in: 200 OK");
    });

    it("should handle network errors", async () => {
      const errorMessage = "Network error";
      mockFetch.mockRejectedValue(new Error(errorMessage));

      const result = await signIn(mockEmail, mockPassword);
      expect(result.error).toBe(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error signing in:",
        expect.any(Error)
      );
    });
  });

  describe("signOut", () => {
    const mockUserId = "user-123";

    it("should succeed on valid sign out", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await signOut(mockUserId);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(`${AUTH_ENDPOINT}/signout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: mockUserId }),
      });
    });

    it("should handle failed sign out", async () => {
      const errorMessage = "Session expired";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: errorMessage }),
      } as Response);

      const result = await signOut(mockUserId);
      expect(result.error).toBe(errorMessage);
    });

    it("should handle network errors", async () => {
      const errorMessage = "Network failure";
      mockFetch.mockRejectedValue(new Error(errorMessage));

      const result = await signOut(mockUserId);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe("signUp", () => {
    const mockUser = {
      email: "new@example.com",
      password: "newPassword123",
      firstName: "John",
      lastName: "Doe",
    };

    it("should return token on successful registration", async () => {
      const mockToken = "new-user-token";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { token: mockToken } }),
      } as Response);

      const result = await signUp(
        mockUser.email,
        mockUser.password,
        mockUser.firstName,
        mockUser.lastName
      );
      expect(result.token).toBe(mockToken);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(`${AUTH_ENDPOINT}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mockUser.email,
          password: mockUser.password,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
        }),
      });
    });

    it("should handle failed registration", async () => {
      const errorMessage = "Email already exists";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: errorMessage }),
      } as Response);

      const result = await signUp(
        mockUser.email,
        mockUser.password,
        mockUser.firstName,
        mockUser.lastName
      );
      expect(result.error).toBe(errorMessage);
      expect(result.token).toBeUndefined();
    });

    it("should handle missing data in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}), // No data field
      } as Response);

      const result = await signUp(
        mockUser.email,
        mockUser.password,
        mockUser.firstName,
        mockUser.lastName
      );
      expect(result.error).toBe("Failed to sign up");
    });

    it("should handle network errors", async () => {
      const errorMessage = "Connection failed";
      mockFetch.mockRejectedValue(new Error(errorMessage));

      const result = await signUp(
        mockUser.email,
        mockUser.password,
        mockUser.firstName,
        mockUser.lastName
      );
      expect(result.error).toBe(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error signing up:",
        expect.any(Error)
      );
    });
  });
});
