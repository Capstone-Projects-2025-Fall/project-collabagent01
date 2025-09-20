/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from "@testing-library/react";
import { useUserActivity } from "../../hooks/useUserActivity";
import { getUserActivity } from "../../api/user";
import { calculateProgress } from "../../utils/calculateProgress";
import { LogEvent } from "../../api/types/event";
import { UserActivityLogItem } from "../../types";

// Mocks
jest.mock("../../api/user", () => ({
  getUserActivity: jest.fn(),
}));

jest.mock("../../utils/calculateProgress", () => ({
  calculateProgress: jest.fn(),
}));

const mockGetUserActivity = getUserActivity as jest.MockedFunction<
  typeof getUserActivity
>;
const mockCalculateProgress = calculateProgress as jest.MockedFunction<
  typeof calculateProgress
>;

const mockActivities: UserActivityLogItem[] = [
  {
    id: 1,
    event: LogEvent.USER_ACCEPT,
    timestamp: "2024-01-01T00:00:00Z",
    timeLapse: 1000,
    metadata: { userClassId: "class-1", userId: "user-123", hasBug: false },
  },
  {
    id: 2,
    event: LogEvent.USER_REJECT,
    timestamp: "2024-01-02T00:00:00Z",
    timeLapse: 1200,
    metadata: { userClassId: "class-2", userId: "user-123", hasBug: true },
  },
  {
    id: 3,
    event: "SOME_OTHER_EVENT",
    timestamp: "2024-01-03T00:00:00Z",
    timeLapse: 900,
    metadata: { userId: "user-123" },
  },
];

describe("useUserActivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateProgress.mockReturnValue({
      totalAccepted: 1,
      correctSuggestions: 1,
      percentageCorrect: 100,
    });
  });

  it("fetches and filters USER_ACCEPT / USER_REJECT events", async () => {
    mockGetUserActivity.mockResolvedValue({
      data: mockActivities,
      error: undefined,
    });

    const { result } = renderHook(() =>
      useUserActivity("user-123", null, "all")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.userActivity).toHaveLength(2);
    expect(
      result.current.userActivity.every((a) =>
        [LogEvent.USER_ACCEPT, LogEvent.USER_REJECT].includes(
          a.event as LogEvent
        )
      )
    ).toBe(true);
    expect(result.current.isEmpty).toBe(false);
    expect(mockCalculateProgress).toHaveBeenCalledWith(
      result.current.userActivity
    );
  });

  it("filters by selectedClassType = 'non-class'", async () => {
    mockGetUserActivity.mockResolvedValue({
      data: [
        {
          ...mockActivities[0],
          metadata: { ...mockActivities[0].metadata, userClassId: undefined },
        },
      ],
      error: undefined,
    });

    const { result } = renderHook(() =>
      useUserActivity("user-123", null, "non-class")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userActivity).toHaveLength(1);
    expect(result.current.userActivity[0].metadata.userClassId).toBeUndefined();
  });

  it("filters by selectedClassType = 'class' and selectedClassId", async () => {
    mockGetUserActivity.mockResolvedValue({
      data: mockActivities,
      error: undefined,
    });

    const { result } = renderHook(() =>
      useUserActivity("user-123", "class-1", "class")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userActivity).toHaveLength(1);
    expect(result.current.userActivity[0].metadata.userClassId).toBe("class-1");
  });

  it("handles error from API", async () => {
    mockGetUserActivity.mockResolvedValue({ data: null, error: "API Error" });

    const { result } = renderHook(() => useUserActivity("user-123"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("API Error");
    expect(result.current.userActivity).toEqual([]);
  });

  it("does not fetch if userId is null", async () => {
    const { result } = renderHook(() => useUserActivity(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetUserActivity).not.toHaveBeenCalled();
    expect(result.current.userActivity).toEqual([]);
    expect(result.current.isEmpty).toBe(true);
  });
});
