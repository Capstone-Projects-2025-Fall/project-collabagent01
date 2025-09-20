import { AISuggestion, ProgressData } from "./types/suggestion";
import { Log } from "./types/event";
import { LOG_ENDPOINT } from "./endpoints";

/**
 * Fetches logs for a given user ID.
 * @param {string} userId 
 * @returns {Promise<{ progressData?: ProgressData; error?: string }>} - The response from the server or an error message.
 */
export async function fetchLogs(userId: string): Promise<{ 
  progressData?: ProgressData;
  error?: string;
}> {
  try {

    const response = await fetch(`${LOG_ENDPOINT}/${userId}`);
    const data = await response.json();
  
    if (!data.data) {
      return {
        progressData: {
          suggestions: [],
          progress: {
            totalAccepted: 0,
            totalWithBugs: 0,
            percentageWithBugs: 0
          }
        }
      }
    }
  
    if (!Array.isArray(data.data)) {
      throw new Error("Invalid logs data format");
    }
  
    const acceptedLogs = data.data.filter((log: Log) => log.event === "USER_ACCEPT");
    const totalAccepted = acceptedLogs.length;
    const totalWithBugs = acceptedLogs.filter((log: Log) => log.metadata?.has_bug).length;
  
    const suggestions: AISuggestion[] = data.data
      .filter((item: Log) => item.metadata?.has_bug !== undefined)
      .map((item: Log) => ({
        hasBug: item.metadata.has_bug,
        suggestionText: item.metadata.suggestion_text,
        id: item.id.toString(),
        created_at: item.timestamp,
        model: item.metadata.model,
        prompt: item.metadata.prompt,
        timeLapsed: item.time_lapse,
        accepted: item.event === "USER_ACCEPT",
      }));
  
    return {
      progressData: {
        suggestions,
        progress: {
          totalAccepted,
          totalWithBugs,
          percentageWithBugs: totalAccepted > 0 ? (totalWithBugs / totalAccepted) * 100 : 0,
        },
      }
    };
  } catch(error){
    console.error("Error fetching logs:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
