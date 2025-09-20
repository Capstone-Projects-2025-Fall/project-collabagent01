import * as vscode from "vscode";
import { LogData, LogEvent } from "../api/types/event";

/**
 * Calculates user progress statistics based on log data.
 *
 * Analyzes how many suggestions the user accepted, how many of those had bugs,
 * and computes the percentage of accepted suggestions that contained bugs.
 *
 * @param logs - An array of user interaction logs (`LogData`).
 * @returns An object containing:
 *   - `totalAccepted`: The number of suggestions accepted by the user.
 *   - `totalWithBugs`: The number of accepted suggestions that had bugs.
 *   - `percentageWithBugs`: The percentage of accepted suggestions that contained bugs.
 */
export function calculateUserProgress(logs: LogData[]): {
  totalAccepted: number;
  totalWithBugs: number;
  percentageWithBugs: number;
} {
  // Filter logs for USER_ACCEPT events
  const acceptedLogs = logs.filter((log) => log.event === LogEvent.USER_ACCEPT);
  const totalAccepted = acceptedLogs.length;
  const totalWithBugs = acceptedLogs.filter(
    (log) => log.metadata.has_bug === true
  ).length;

  // Calculate the percentage of accepted suggestions with bugs
  const percentageWithBugs =
    totalAccepted > 0 ? (totalWithBugs / totalAccepted) * 100 : 0;

  return {
    totalAccepted,
    totalWithBugs,
    percentageWithBugs,
  };
}
