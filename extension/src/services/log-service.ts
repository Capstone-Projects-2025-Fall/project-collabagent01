import { trackEvent, getLogsByUser } from "../api/log-api";
import { LogData, LogEvent } from "../api/types/event";
import { calculateUserProgress } from "./user-service";
import {
  getUserSection,
  getUserStatus,
  updateUserSection,
  updateUserStatus,
} from "../api/user-api";
import { getAuthContext } from "./auth-service";
import { User, UserSectionStatus, UserStatus } from "../api/types/user";
import { errorNotification, notifyUser } from "../views/notifications";
import { getSelectedClass } from "../utils/userClass";
import { SuggestionContext } from "../api/types/suggestion";

/**
 * This module handles tracking and evaluation of user interactions with AI-generated suggestions.
 * It logs acceptance/rejection events, monitors user progress, and updates user or section statuses accordingly.
 */

let suggestionContext = {
  suggestionId: "",
  hasBug: false,
  startTime: 0,
};

/**
 * Logs a user interaction event (accept or reject) for a suggestion.
 *
 * Tracks elapsed time, suggestion metadata, and user state.
 * If the user is suspended, the behavior for logging changes.
 *
 * @param accepted - Whether the user accepted (`true`) or rejected (`false`) the suggestion.
 * @param context - The suggestion context containing suggestion ID, bug presence, and start time.
 */
export const logSuggestionEvent = async (
  accepted: boolean,
  context: SuggestionContext
) => {
  const { suggestionId, hasBug, startTime } = context;
  const elapsedTime = Date.now() - startTime;
  const { context: user, error } = await getAuthContext();
  if (error || user === undefined) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  const userId = user.id;
  const selectedClass = getSelectedClass();

  let userSection;
  try {
    userSection = await getUserSection(user.id, selectedClass?.id);
  } catch (error) {
    await errorNotification(`Failed to get user section: ${error}`);
    return;
  }

  let finalHasBug = hasBug;
  let logEventType = accepted ? LogEvent.USER_ACCEPT : LogEvent.USER_REJECT;

  const response = await getUserStatus(user.id, selectedClass?.id);
  const userClassStatus = response.data || null;

  const status = userClassStatus ?? user.userStatus;

  if (status === UserStatus.SUSPENDED) {
    logEventType = LogEvent.USER_ACCEPT;
    finalHasBug = !accepted;
  }

  const logData: LogData = {
    event: logEventType,
    timeLapse: elapsedTime,
    metadata: {
      user_id: userId,
      suggestion_id: suggestionId,
      has_bug: finalHasBug,
      user_section_id: userSection.userSectionId,
      user_class_id: selectedClass?.id,
    },
  };

  trackEvent(logData);

  const { logs, error: getLogsError } = await getLogsByUser(
    user.id,
    userSection.userSectionId as string
  );
  if (getLogsError || logs === null || logs === undefined || logs.length < 2) {
    return;
  }

  await evaluateUserProgress(
    user,
    logs,
    userSection.userSectionId,
    selectedClass?.id
  );
};

export const logLineSuggestionEvent = async (
  accepted: boolean,
  context: SuggestionContext
) => {
  const { suggestionId, hasBug, startTime } = context;
  const elapsedTime = Date.now() - startTime;
  const { context: user, error } = await getAuthContext();
  if (error || user === undefined) {
    await errorNotification(`Failed to get user context: ${error}`);
    return;
  }
  const userId = user.id;
  const selectedClass = getSelectedClass();

  let userSection;
  try {
    userSection = await getUserSection(user.id, selectedClass?.id);
  } catch (error) {
    await errorNotification(`Failed to get user section: ${error}`);
    return;
  }

  let logEventType = accepted
    ? LogEvent.USER_LINE_ACCEPT
    : LogEvent.USER_LINE_REJECT;

  const logData: LogData = {
    event: logEventType,
    timeLapse: elapsedTime,
    metadata: {
      user_id: userId,
      line_suggestion_id: suggestionId,
      has_bug: hasBug,
      user_section_id: userSection.userSectionId,
      user_class_id: selectedClass?.id,
    },
  };

  trackEvent(logData);
};

/**
 * Evaluates a user's progress based on their logged interactions with suggestions.
 *
 * Compares the user's acceptance rate and bug rate against configured thresholds
 * to determine whether to award a badge, suspend, or lock their account.
 *
 * @param user - The authenticated user object.
 * @param logs - Array of user event logs (`LogData`).
 * @param userSectionId - (Optional) ID of the user's active section.
 * @param userClassId - (Optional) ID of the user's current class.
 */
export async function evaluateUserProgress(
  user: User,
  logs: LogData[],
  userSectionId?: string,
  userClassId?: string
) {
  const {
    id,
    userStatus,
    settings: {
      active_threshold,
      enable_quiz,
      suspend_threshold,
      pass_rate,
      suspend_rate,
    },
  } = user;

  if (!enable_quiz) {
    return;
  }
  const ACTIVE_THRESHOLD = active_threshold;
  const SUSPEND_THRESHOLD = suspend_threshold;
  const PASS_RATE = pass_rate;
  const SUSPEND_RATE = suspend_rate;

  const { totalAccepted, totalWithBugs, percentageWithBugs } =
    calculateUserProgress(logs);
  const bugFreeRate = 100 - percentageWithBugs;

  const response = await getUserStatus(user.id, userClassId);
  const userClassStatus = response.data || null;

  const status = userClassStatus ?? userStatus;
  const threshold =
    status === UserStatus.SUSPENDED ? SUSPEND_THRESHOLD : ACTIVE_THRESHOLD;

  if (totalAccepted < threshold) {
    return;
  }

  if (bugFreeRate >= PASS_RATE) {
    await updateUserSection(id, UserSectionStatus.COMPLETE, userSectionId);
    await notifyUser(
      "Congrats! You've earned a badge!",
      "https://clover.nickrucinski.com/"
    );
  } else if (bugFreeRate >= SUSPEND_RATE) {
    if (status === UserStatus.ACTIVE) {
      await updateUserStatus(id, UserStatus.SUSPENDED, userClassId);
      await notifyUser(
        "We're currently slowing you down with suggestions. Please review the next 10 suggestions carefully to improve your progress."
      );
      return;
    }
    await updateUserSection(id, UserSectionStatus.NEED_REVIEW, userSectionId);
    await updateUserStatus(id, UserStatus.LOCKED, userClassId);
  } else {
    await updateUserSection(id, UserSectionStatus.NEED_REVIEW, userSectionId);
    await updateUserStatus(id, UserStatus.LOCKED, userClassId);
  }
}
