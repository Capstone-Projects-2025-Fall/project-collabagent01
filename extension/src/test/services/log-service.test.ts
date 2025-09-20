const mockTrackEvent = jest.fn();
const mockGetLogsByUser = jest.fn();
const mockGetUserSection = jest.fn();
const mockGetUserStatus = jest.fn();
const mockUpdateUserSection = jest.fn();
const mockUpdateUserStatus = jest.fn();
const mockNotifyUser = jest.fn();
const mockErrorNotification = jest.fn();
const mockCalculateUserProgress = jest.fn();

jest.mock("../../api/log-api", () => ({
  trackEvent: mockTrackEvent,
  getLogsByUser: mockGetLogsByUser,
}));

jest.mock("../../api/user-api", () => ({
  getUserSection: mockGetUserSection,
  getUserStatus: mockGetUserStatus,
  updateUserSection: mockUpdateUserSection,
  updateUserStatus: mockUpdateUserStatus,
}));

jest.mock("../../services/user-service", () => ({
  calculateUserProgress: mockCalculateUserProgress,
}));

jest.mock("../../views/notifications", () => ({
  errorNotification: mockErrorNotification,
  notifyUser: mockNotifyUser,
}));

jest.mock("../../services/auth-service", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("../../utils/userClass", () => ({
  getSelectedClass: jest.fn(),
}));

import { getAuthContext } from "../../services/auth-service";
import { getSelectedClass } from "../../utils/userClass";
import { User, UserStatus, UserSectionStatus } from "../../api/types/user";
import { LogData, LogEvent } from "../../api/types/event";
import {
  logSuggestionEvent,
  evaluateUserProgress,
} from "../../services/log-service";

describe("logSuggestionEvent", () => {
  const testUser = {
    id: "123",
    email: "test@example.com",
    isAuthenticated: true,
    isLocked: false,
    userStatus: UserStatus.ACTIVE,
    role: "admin",
    settings: {
      bug_percentage: 10,
      show_notifications: true,
      give_suggestions: false,
      enable_quiz: true,
      active_threshold: 5,
      suspend_threshold: 10,
      pass_rate: 80,
      suspend_rate: 30,
    },
  };

  const testContext = {
    suggestionId: "suggestion-123",
    hasBug: false,
    startTime: Date.now() - 1000,
  };

  const testClass = {
    id: "class-123",
    name: "Test Class",
  };

  const testUserSection = {
    userSectionId: "section-123",
  };

  const testLogs = [
    { event: LogEvent.USER_ACCEPT, metadata: { has_bug: false } },
    { event: LogEvent.USER_REJECT, metadata: { has_bug: true } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthContext as jest.Mock).mockResolvedValue({ context: testUser });
    (getSelectedClass as jest.Mock).mockReturnValue(testClass);
    mockGetUserSection.mockResolvedValue(testUserSection);
    mockGetUserStatus.mockResolvedValue({ data: UserStatus.ACTIVE });
    mockGetLogsByUser.mockResolvedValue({ logs: testLogs, error: null });
    mockTrackEvent.mockResolvedValue(undefined);
    mockCalculateUserProgress.mockReturnValue({
      totalAccepted: 1,
      totalWithBugs: 0,
      percentageWithBugs: 0,
    });
    mockErrorNotification.mockResolvedValue(undefined);
  });

  it("should log accepted suggestion event for active user", async () => {
    await logSuggestionEvent(true, testContext);
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it("should log rejected suggestion event for active user", async () => {
    await logSuggestionEvent(false, testContext);
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it("should handle suspended user correctly", async () => {
    mockGetUserStatus.mockResolvedValue({ data: UserStatus.SUSPENDED });
    await logSuggestionEvent(false, testContext);
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it("should handle missing auth context", async () => {
    (getAuthContext as jest.Mock).mockResolvedValue({ error: "Auth error" });
    await logSuggestionEvent(true, testContext);
    expect(mockErrorNotification).toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("should handle error getting logs", async () => {
    mockGetLogsByUser.mockResolvedValue({ error: "fail" });
    await logSuggestionEvent(true, testContext);
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});

describe("evaluateUserProgress", () => {
  const baseUser = {
    id: "u1",
    userStatus: UserStatus.ACTIVE,
    settings: {
      enable_quiz: true,
      active_threshold: 2,
      suspend_threshold: 3,
      pass_rate: 80,
      suspend_rate: 30,
    },
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should skip if quiz is disabled", async () => {
    const user = {
      ...baseUser,
      settings: { ...baseUser.settings, enable_quiz: false },
    };
    await evaluateUserProgress(user, [], "section", "class");
    expect(mockUpdateUserStatus).not.toHaveBeenCalled();
  });

  it("should promote to COMPLETE if bug-free rate >= PASS_RATE", async () => {
    mockCalculateUserProgress.mockReturnValue({
      totalAccepted: 2,
      totalWithBugs: 0,
      percentageWithBugs: 0,
    });
    mockGetUserStatus.mockResolvedValue({ data: UserStatus.ACTIVE });

    await evaluateUserProgress(
      baseUser,
      [{} as LogData, {} as LogData],
      "section",
      "class"
    );

    expect(mockUpdateUserSection).toHaveBeenCalledWith(
      "u1",
      UserSectionStatus.COMPLETE,
      "section"
    );
    expect(mockNotifyUser).toHaveBeenCalled();
  });

  it("should suspend user if rate >= suspend_rate and status is ACTIVE", async () => {
    mockCalculateUserProgress.mockReturnValue({
      totalAccepted: 2,
      totalWithBugs: 1,
      percentageWithBugs: 40,
    });
    mockGetUserStatus.mockResolvedValue({ data: UserStatus.ACTIVE });

    await evaluateUserProgress(
      baseUser,
      [{} as LogData, {} as LogData],
      "section",
      "class"
    );

    expect(mockUpdateUserStatus).toHaveBeenCalledWith(
      "u1",
      UserStatus.SUSPENDED,
      "class"
    );
    expect(mockNotifyUser).toHaveBeenCalled();
  });

  it("should lock user if bug-free rate < suspend_rate", async () => {
    mockCalculateUserProgress.mockReturnValue({
      totalAccepted: 2,
      totalWithBugs: 2,
      percentageWithBugs: 90,
    });
    mockGetUserStatus.mockResolvedValue({ data: UserStatus.ACTIVE });

    await evaluateUserProgress(
      baseUser,
      [{} as LogData, {} as LogData],
      "section",
      "class"
    );

    expect(mockUpdateUserSection).toHaveBeenCalledWith(
      "u1",
      UserSectionStatus.NEED_REVIEW,
      "section"
    );
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(
      "u1",
      UserStatus.LOCKED,
      "class"
    );
  });
});
