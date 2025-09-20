import { registerUser } from "../../api/auth";

const originalFetch = global.fetch;

jest.mock("../../api/endpoints", () => ({
  BASE_ENDPOINT: "http://test-endpoint",
  AUTH_ENDPOINT: "http://test-endpoint/auth",
}));

describe("registerUser", () => {
  afterEach(() => {
    global.fetch = originalFetch; // Restore fetch after each test
  });

  it("successfully registers a user", async () => {
    const mockResponse = {
      id: "user123",
      email: "test@example.com",
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const data = await registerUser(
      "John",
      "Doe",
      "test@example.com",
      "password123"
    );
    expect(data).toEqual(mockResponse);
  });

  it("throws an error on failed registration", async () => {
    const mockError = {
      error: "Email already exists",
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => mockError,
    } as Response);

    await expect(
      registerUser("Jane", "Doe", "taken@example.com", "password123")
    ).rejects.toThrow("Email already exists");
  });
});
