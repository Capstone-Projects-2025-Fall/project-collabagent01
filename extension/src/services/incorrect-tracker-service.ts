import { LogData, LogEvent } from "../api/types/event";
import { trackEvent } from "../api/log-api";


/**
 * Represents a record of a user's incorrect suggestion selection.
 */
interface IncorrectUserChoice {
    suggestion: string;
    suggestionStartTime: number;
}


/**
 * A map to store incorrect suggestions selected by each user.
 * Keyed by user ID, with an array of incorrect choices per user.
 */
const incorrectUserChoices: Map<string, IncorrectUserChoice[]> = new Map();

/**
 * Tracks when a user selects an incorrect suggestion.
 *
 * Logs a `USER_REJECT` event for telemetry and stores the incorrect selection
 * along with the timestamp.
 *
 * @param userId - The unique identifier of the user.
 * @param incorrectSuggestion - The incorrect suggestion the user selected.
 */
export function trackIncorrectChoices(userId: string, incorrectSuggestion: string): void {
    /** Make sure that the user ID is real. */
    if(!userId) {
        console.warn("No User ID Detected.");
        return;
    }
    /** Adds an array of incorrect user choices for a user and their ID if they are not in the map yet. */
    if(!incorrectUserChoices.has(userId)){
        incorrectUserChoices.set(userId, []);
    }
    /** Gets the user's incorrect choices and adds new incorrect choice to the user's array. */
    incorrectUserChoices.get(userId)!.push({
        suggestion: incorrectSuggestion,
        suggestionStartTime: Date.now(),
    });
    /** Create log for when the user does not accept a code suggestion from the model. */
    const logData: LogData = {
        event: LogEvent.USER_REJECT,
        timeLapse: 0,
        metadata: { userId, incorrectSuggestion, incorrectAttempt: incorrectUserChoices.get(userId)?.length || 1 },
    };
    trackEvent(logData);
}

/**
 * Retrieves all incorrect suggestions selected by a specific user.
 *
 * @param userId - The unique identifier of the user.
 * @returns An array of `IncorrectUserChoice` entries representing the user's incorrect selections.
 */
export function getIncorrectChoices(userId: string): IncorrectUserChoice[] {
    return incorrectUserChoices.get(userId) || [];
}