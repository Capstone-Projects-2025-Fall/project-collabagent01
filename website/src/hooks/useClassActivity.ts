import { useEffect, useState } from "react";
import { UserActivityLogItem } from "../types";
import { getClassActivityByClassId } from "../api/classes";
import { calculateProgress, ProgressData } from "../utils/calculateProgress";
import { UserClass } from "../api/types/user";
import { LogEvent } from "../api/types/event";

/**
 * Custom hook to fetch and manage class activity logs.
 * It fetches all activity logs for the provided classes and filters them based on the selected class ID.
 * @param classes - Array of UserClass objects representing the classes to fetch activity for.
 * @param selectedClassId - The ID of the selected class to filter activity logs by.
 * @returns An object containing the following properties:
 */
export const useClassActivity = (
  classes: UserClass[],
  selectedClassId: string | null
) => {
  const [allActivity, setAllActivity] = useState<UserActivityLogItem[]>([]);
  const [classActivity, setClassActivity] = useState<UserActivityLogItem[]>([]);
  const [progressData, setProgressData] = useState<ProgressData>({
    totalAccepted: 0,
    correctSuggestions: 0,
    percentageCorrect: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all logs only once
  useEffect(() => {
    const fetchAllClassActivity = async () => {
      try {
        setError(null);
        setLoading(true);

        const classRequests = classes
          .filter((classInfo) => classInfo.id !== "all")
          .map(async (classInfo) => {
            try {
              const response = await getClassActivityByClassId(classInfo.id!);
              if (response.error) throw new Error(response.error);

              if (!Array.isArray(response.data)) {
                throw new Error(
                  "Invalid response: expected an array of activity logs"
                );
              }

              return response.data;
            } catch (err) {
              console.error(
                `Failed to fetch for class ${classInfo.classTitle}`,
                err
              );
              return [];
            }
          });

        const allLogsArrays = await Promise.all(classRequests);
        const allLogs = allLogsArrays.flat();
        const validLogs = allLogs.filter(
          (log) =>
            log.event === LogEvent.USER_ACCEPT ||
            log.event === LogEvent.USER_REJECT
        );

        setAllActivity(validLogs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if (classes.length > 0) {
      fetchAllClassActivity();
    } else {
      setLoading(false);
    }
  }, [classes]);

  // Filter logs by selected class
  useEffect(() => {
    const filtered =
      selectedClassId && selectedClassId !== "all"
        ? allActivity.filter(
            (log) => log.metadata.userClassId === selectedClassId
          )
        : allActivity;

    setClassActivity(filtered);

    const progress = calculateProgress(
      selectedClassId === "all" ? allActivity : filtered
    );
    setProgressData(progress);
  }, [selectedClassId, allActivity]);

  return {
    allActivity,
    classActivity,
    progressData,
    loading,
    error,
    isEmpty: !loading && classActivity.length === 0,
  };
};
