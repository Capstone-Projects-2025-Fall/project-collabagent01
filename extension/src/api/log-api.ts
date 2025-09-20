import { LOG_ENDPOINT } from "./types/endpoints";
import { LogData } from "./types/event";
import { convertToSnakeCase } from "../utils";


/**
 * Logs a user interaction event related to an AI-generated suggestion.
 *
 * Converts the event data to snake_case and sends it to the backend logging service.
 *
 * @param logData - The data describing the user event to be logged.
 */
export function trackEvent(logData: LogData) {
  const logDataForBackend = convertToSnakeCase(logData);

  console.log("Logging data for event:", logDataForBackend.event);

  fetch(LOG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(logDataForBackend),
  }).catch((err) => console.error("Failed to log data:", err));
}

/**
 * Fetches all logged user interaction events for a specific user.
 *
 * Supports optional filtering by user section ID and/or user class ID.
 *
 * @param userId - The unique ID of the user whose logs should be fetched.
 * @param userSectionId - (Optional) The section ID to filter logs by user section.
 * @param userClassId - (Optional) The class ID to filter logs by user class.
 * @returns A promise resolving to an object containing either the logs array or an error message.
 */
export async function getLogsByUser(
  userId: string,
  userSectionId?: string,
  userClassId?: string
): Promise<{ logs?: LogData[]; error?: string }> {
  try {
    const url = new URL(`${LOG_ENDPOINT}/${userId}`);

    if (userSectionId) {
      url.searchParams.append("user_section_id", userSectionId);
    }

    if (userClassId) {
      url.searchParams.append("user_class_id", userClassId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const data = await response.json();

    return { logs: data.data };
  } catch (error) {
    console.error("Error fetching logs:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
