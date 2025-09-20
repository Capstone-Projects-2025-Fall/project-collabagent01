import { renderHook, waitFor } from "@testing-library/react";
import { useClassActivity } from "../../hooks/useClassActivity";
import { getClassActivityByClassId } from "../../api/classes";
import { LogEvent } from "../../api/types/event";
import { UserActivityLogItem, UserClass } from "../../api/types/user";
import { calculateProgress } from "../../utils/calculateProgress";

jest.mock("../../api/classes", () => ({
  getClassActivityByClassId: jest.fn(),
}));

jest.mock("../../utils/calculateProgress", () => ({
  calculateProgress: jest.fn(),
}));

const mockGetClassActivity = getClassActivityByClassId as jest.Mock;
const mockCalculateProgress = calculateProgress as jest.Mock;

const logsClass1: UserActivityLogItem[] = [
  {
    id: 1,
    event: LogEvent.USER_ACCEPT,
    timestamp: new Date().toISOString(),
    timeLapse: 400,
    metadata: { userClassId: "class-1" },
  },
  {
    id: 2,
    event: LogEvent.USER_REJECT,
    timestamp: new Date().toISOString(),
    timeLapse: 300,
    metadata: { userClassId: "class-1" },
  },
];

const logsClass2: UserActivityLogItem[] = [
  {
    id: 3,
    event: LogEvent.USER_ACCEPT,
    timestamp: new Date().toISOString(),
    timeLapse: 500,
    metadata: { userClassId: "class-2" },
  },
];

describe("useClassActivity", () => {
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("fetches and filters class activity", async () => {
    mockGetClassActivity
      .mockResolvedValueOnce({ data: logsClass1, error: null })
      .mockResolvedValueOnce({ data: logsClass2, error: null });

    mockCalculateProgress.mockReturnValue({
      totalAccepted: 2,
      correctSuggestions: 1,
      percentageCorrect: 50,
    });

    const classes: UserClass[] = [
      { id: "class-1", classTitle: "Class 1", classCode: "C1" },
      { id: "class-2", classTitle: "Class 2", classCode: "C2" },
    ];

    const { result } = renderHook(() => useClassActivity(classes, "class-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetClassActivity).toHaveBeenCalledTimes(2);
    expect(result.current.allActivity).toEqual([...logsClass1, ...logsClass2]);
    expect(result.current.classActivity).toEqual(logsClass1);
    expect(mockCalculateProgress).toHaveBeenCalledWith(logsClass1);
  });

  it("handles no classes gracefully", async () => {
    const { result } = renderHook(() => useClassActivity([], "class-1"));

    expect(result.current.loading).toBe(false);
    expect(result.current.allActivity).toEqual([]);
  });

  it("returns error if fetch fails", async () => {
    const error = new Error("Fetch failed");
    mockGetClassActivity.mockResolvedValueOnce({
      data: undefined,
      error: "Fetch failed",
    });

    const classes: UserClass[] = [
      { id: "class-1", classTitle: "Class 1", classCode: "C1" },
    ];

    const { result } = renderHook(() => useClassActivity(classes, "class-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch for class Class 1",
      new Error("Fetch failed")
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch for class Class 1",
      error
    );
  });

  it("filters correctly when selectedClassId is null", async () => {
    mockGetClassActivity
      .mockResolvedValueOnce({ data: logsClass1, error: null })
      .mockResolvedValueOnce({ data: logsClass2, error: null });

    mockCalculateProgress.mockReturnValue({
      totalAccepted: 3,
      correctSuggestions: 2,
      percentageCorrect: 66.67,
    });

    const classes: UserClass[] = [
      { id: "class-1", classTitle: "Class 1", classCode: "C1" },
      { id: "class-2", classTitle: "Class 2", classCode: "C2" },
    ];

    const { result } = renderHook(() => useClassActivity(classes, null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.classActivity).toEqual([
      ...logsClass1,
      ...logsClass2,
    ]);
    expect(mockCalculateProgress).toHaveBeenCalledWith([
      ...logsClass1,
      ...logsClass2,
    ]);
  });

  it("handles invalid response structure", async () => {
    mockGetClassActivity.mockResolvedValueOnce({
      data: { not: "an array" },
      error: null,
    });

    const classes: UserClass[] = [
      { id: "class-1", classTitle: "Class 1", classCode: "C1" },
    ];

    const { result } = renderHook(() => useClassActivity(classes, "class-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch for class Class 1",
      new Error("Invalid response: expected an array of activity logs")
    );
  });

  it("calculates progress for 'all' class filter", async () => {
    mockGetClassActivity
      .mockResolvedValueOnce({ data: logsClass1, error: null })
      .mockResolvedValueOnce({ data: logsClass2, error: null });

    mockCalculateProgress.mockReturnValue({
      totalAccepted: 3,
      correctSuggestions: 2,
      percentageCorrect: 66.67,
    });

    const classes: UserClass[] = [
      { id: "class-1", classTitle: "Class 1", classCode: "C1" },
      { id: "class-2", classTitle: "Class 2", classCode: "C2" },
    ];

    const { result } = renderHook(() => useClassActivity(classes, "all"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const expectedLogs = [...logsClass1, ...logsClass2].filter(
      (log) =>
        log.event === LogEvent.USER_ACCEPT || log.event === LogEvent.USER_REJECT
    );

    expect(result.current.classActivity).toEqual(expectedLogs);
    expect(mockCalculateProgress).toHaveBeenCalledWith(expectedLogs);
  });
});
