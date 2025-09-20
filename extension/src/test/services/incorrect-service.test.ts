import { trackEvent } from "../../api/log-api";
import { LogData, LogEvent } from "../../api/types/event";
import {
  getIncorrectChoices,
  trackIncorrectChoices,
} from "../../services/incorrect-tracker-service";

jest.mock("../../api/log-api", () => ({
  trackEvent: jest.fn(),
}));

const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

describe("Incorrect Choices Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackIncorrectChoices", () => {
    it("should add incorrect choice for a user", () => {
      const userId = "test-user-1";
      const incorrectSuggestion = "bad suggestion";

      trackIncorrectChoices(userId, incorrectSuggestion);

      const choices = getIncorrectChoices(userId);
      expect(choices).toHaveLength(1);
      expect(choices[0].suggestion).toBe(incorrectSuggestion);
      expect(choices[0].suggestionStartTime).toBeCloseTo(Date.now(), -2);
    });

    it("should initialize user entry if not exists", () => {
      const userId = "test-user-2";
      const incorrectSuggestion = "bad suggestion";

      // Verify no entries exist initially
      expect(getIncorrectChoices(userId)).toHaveLength(0);

      // First call should initialize
      trackIncorrectChoices(userId, incorrectSuggestion);

      // Verify entry was created
      const choices = getIncorrectChoices(userId);
      expect(choices).toHaveLength(1);
    });

    it("should not track if userId is missing", () => {
      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      trackIncorrectChoices("", "bad suggestion");

      expect(consoleWarnSpy).toHaveBeenCalledWith("No User ID Detected.");
      expect(mockTrackEvent).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should track event with correct metadata", () => {
      const userId = "test-user-3";

      trackIncorrectChoices(userId, "first bad");
      trackIncorrectChoices(userId, "second bad");

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);

      const lastCall = mockTrackEvent.mock.calls[1][0];
      expect(lastCall.event).toBe(LogEvent.USER_REJECT);
      expect(lastCall.timeLapse).toBe(0);
      expect(lastCall.metadata.userId).toBe(userId);
      expect(lastCall.metadata.incorrectSuggestion).toBe("second bad");
      expect(lastCall.metadata.incorrectAttempt).toBe(2);
    });
  });

  describe("getIncorrectChoices", () => {
    it("should return empty array for unknown user", () => {
      const result = getIncorrectChoices("unknown-user");
      expect(result).toEqual([]);
    });

    it("should return all choices for user", () => {
      const userId = "test-user-4";

      trackIncorrectChoices(userId, "first bad");
      trackIncorrectChoices(userId, "second bad");

      const result = getIncorrectChoices(userId);
      expect(result).toHaveLength(2);
      expect(result[0].suggestion).toBe("first bad");
      expect(result[1].suggestion).toBe("second bad");
    });

    it("should return different results for different users", () => {
      const user1 = "test-user-5";
      const user2 = "test-user-6";

      trackIncorrectChoices(user1, "user1 bad");
      trackIncorrectChoices(user2, "user2 bad");

      expect(getIncorrectChoices(user1)).toHaveLength(1);
      expect(getIncorrectChoices(user2)).toHaveLength(1);
      expect(getIncorrectChoices(user1)[0].suggestion).toBe("user1 bad");
      expect(getIncorrectChoices(user2)[0].suggestion).toBe("user2 bad");
    });
  });
});
