import { trackEvent } from "../../api/log-api";
import {
  fetchSuggestions,
  refinePrompt,
  saveSuggestionToDatabase,
  getHint,
  getExplanation,
  submitCode,
} from "../../api/suggestion-api";
import { LogEvent } from "../../api/types/event";

global.fetch = jest.fn() as jest.Mock;
jest.mock("../../api/log-api");

jest.mock("../../utils", () => ({
  convertToSnakeCase: jest.fn((obj) => obj),
  getSettings: jest.fn().mockReturnValue({
    vendor: "google",
    model: "gemini-2.0-flash",
  }),
}));

describe("Suggestion API", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    require("../../utils").getSettings.mockReturnValue({
      vendor: "google",
      model: "gemini-2.0-flash",
    });
  });

  describe("fetchSuggestions", () => {
    it("should return suggestions for valid prompt", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            data: { response: ["suggestion1", "suggestion2"] },
          }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await fetchSuggestions("test prompt");

      expect(result.suggestions).toEqual(["suggestion1", "suggestion2"]);
      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "test prompt",
          vendor: "google",
          model: "gemini-2.0-flash",
          isIntervened: false,
        }),
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: LogEvent.MODEL_GENERATE,
          timeLapse: expect.any(Number),
          metadata: expect.objectContaining({
            suggestions: ["suggestion1", "suggestion2"],
            vendor: "google",
            model: "gemini-2.0-flash",
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: () => Promise.resolve({}),
      } as Response);

      const result = await fetchSuggestions("test prompt");

      expect(result).toEqual({
        error: "Error: 500 Server Error",
      });
    });

    it("should handle missing suggestions in fetchSuggestions", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await fetchSuggestions("test prompt");
      expect(result.error).toBe("No suggestions found");
    });
  });

  describe("refinePrompt", () => {
    it("should return refined prompt", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({ data: { refinedPrompt: "refined test prompt" } }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await refinePrompt("raw prompt");
      expect(result.refinedPrompt).toBe("refined test prompt");
    });

    it("should handle refinement failure", async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: "Refinement failed" }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await refinePrompt("raw prompt");
      expect(result.error).toBe("Refinement failed");
    });

    it("should handle missing refinedPrompt even if ok is true", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await refinePrompt("raw prompt");
      expect(result.error).toBe("Failed to refine prompt");
    });
  });

  describe("saveSuggestionToDatabase", () => {
    const mockSuggestion = {
      id: "mock-id-123",
      prompt: "test prompt",
      suggestionArray: ["suggestion1"],
      hasBug: false,
      model: "test-model",
      vendor: "test-vendor",
      userSectionId: "section-123",
    };

    it("should successfully save suggestion", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: "suggestion-id-123" }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await saveSuggestionToDatabase(mockSuggestion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("suggestion-id-123");
      } else {
        fail(`Expected success but got error: ${result.error}`);
      }
    });

    it("should handle save failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as Response);

      const result = await saveSuggestionToDatabase(mockSuggestion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("400 Bad Request");
      } else {
        fail("Expected an error but got success");
      }
    });
  });

  describe("getHint", () => {
    const mockRequest = {
      prompt: "test prompt",
      wrongCode: "wrong code",
      rightCode: "right code",
    };

    it("should return hint for valid request", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: { hint: "helpful hint" } }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await getHint(mockRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("helpful hint");
      } else {
        fail(`Expected success but got error: ${result.error}`);
      }
    });

    it("should handle invalid response", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({}), // No data
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await getHint(mockRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid response from server");
      } else {
        fail("Expected failure but got success");
      }
    });
  });

  describe("getExplanation", () => {
    const mockRequest = {
      prompt: "test prompt",
      wrongCode: "wrong code",
      rightCode: "right code",
    };

    it("should return explanation for valid request", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({ data: { explanation: "detailed explanation" } }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await getExplanation(mockRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("detailed explanation");
      } else {
        fail(`Expected success but got error: ${result.error}`);
      }
    });

    it("should handle server error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await getExplanation(mockRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Network error");
      } else {
        fail("Expected failure but got success");
      }
    });
  });

  describe("submitCode", () => {
    it("should return true for correct submission", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: { isCorrect: true } }),
      };
      mockFetch.mockResolvedValue(mockResponse as Response);

      const result = await submitCode("wrong", "fixed", "prompt");
      expect(result).toBe(true);
    });

    it("should return false for failed submission", async () => {
      mockFetch.mockRejectedValue(new Error("Submission failed"));

      const result = await submitCode("wrong", "fixed", "prompt");
      expect(result).toBe(false);
    });

    it("should handle missing isCorrect field in submitCode", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await submitCode("wrong", "fixed", "prompt");
      expect(result).toBe(undefined);
    });
  });
});
