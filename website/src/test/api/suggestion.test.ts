import { getSuggestionById } from "../../api/suggestion";

const originalFetch = global.fetch;

jest.mock("../../api/endpoints", () => ({
  AI_SUGGESTION_ENDPOINT: "http://mock-api/suggestion",
}));

describe("getSuggestionById", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns suggestion data when response is valid", async () => {
    const mockSuggestion = {
      id: "123",
      created_at: "2025-05-01T00:00:00Z",
      has_bug: true,
      suggestion_array: ["code line 1", "code line 2"],
      model: "gpt-test",
      prompt: "What's next?",
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockSuggestion }),
    } as Response);

    const result = await getSuggestionById("123");

    expect(result.data?.id).toBe("123");
    expect(result.data?.hasBug).toBe(true);
    expect(result.data?.suggestionArray.length).toBe(2);
  });

  it("returns an error when response.ok is false", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Not found" }),
    } as Response);

    const result = await getSuggestionById("404");

    expect(result.error).toBe("Not found");
    expect(result.data).toBeUndefined();
  });

  it("returns an error when data is missing", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await getSuggestionById("no-data");

    expect(result.error).toBe("Invalid response: expected suggestion data");
  });

  it("handles fetch failure", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Server down"));

    const result = await getSuggestionById("500");

    expect(result.error).toBe("Server down");
    expect(result.data).toBeUndefined();
  });
});
