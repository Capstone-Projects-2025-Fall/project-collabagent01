import { getSuggestionById } from "../api/suggestion";
import { LogEvent } from "../api/types/event";
import { UserActivityLogItem } from "../api/types/user";
import { CodeSuggestion } from "../api/types/suggestion";
import { useEffect, useState } from "react";

/**
 * SuggestionTable component displays a table of user activity log items and allows the user to view details of a selected suggestion.
 * It fetches suggestion details from the server when a log item is clicked.
 * @param param0 - props for the SuggestionTable component
 * @param param0.logItems - array of log items to display in the table
 * @param param0.range - range of log items to display (default is [0, 10])
 * @returns
 */
export const SuggestionTable = ({
  logItems,
  startIndex = 0,
}: {
  logItems: UserActivityLogItem[];
  startIndex?: number;
}) => {
  const [selectedLogItem, setSelectedLogItem] =
    useState<UserActivityLogItem | null>(null);
  const [suggestionDetail, setSuggestionDetail] =
    useState<CodeSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestion = async () => {
      console.log(JSON.stringify(selectedLogItem?.metadata, null, 2));

      if (!selectedLogItem?.metadata?.suggestionId) return;

      setLoading(true);
      setFetchError(null);

      try {
        const result = await getSuggestionById(
          selectedLogItem.metadata.suggestionId as unknown as string
        );

        console.log("result from getSuggestionById:", result);

        if (result.error) {
          setFetchError(result.error);
          setSuggestionDetail(null);
        }

        if (result.data) {
          const modifiedResult: CodeSuggestion = {
            ...result.data,
            timeLapse: selectedLogItem.timeLapse,
            accepted: selectedLogItem.event === LogEvent.USER_ACCEPT,
          };

          setSuggestionDetail(modifiedResult || null);
        }
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Failed to fetch suggestion"
        );
        setSuggestionDetail(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestion();
  }, [selectedLogItem]);

  return (
    <>
      <table className="w-full text-sm text-left text-text">
        <thead className="text-text">
          <tr className="border-b border-gray-900 dark:border-gray-100 fonr-semibold">
            <th className="w-4">No.</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Accepted?</th>
            <th className="px-4 py-2">Bug?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-400 dark:divide-gray-100">
          {logItems.map((logItem, index) => (
            <tr
              key={logItem.id}
              className="hover:bg-gray-400 dark:hover:bg-gray-700 transition cursor-pointer"
              onClick={() => setSelectedLogItem(logItem)}
            >
              <td className="p-2">{startIndex + index + 1}</td>
              <td className="px-4 py-2">
                {new Date(logItem.timestamp).toLocaleDateString()}
              </td>
              <td className="px-4 py-2">
                {logItem.event === LogEvent.USER_ACCEPT ? "Yes" : "No"}
              </td>
              <td className="px-4 py-2">
                {logItem.metadata.hasBug ? "Yes" : "No"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedLogItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLogItem(null);
            }
          }}
        >
          <div className="bg-gray-200 dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-3xl w-full relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
              onClick={() => setSelectedLogItem(null)}
            >
              &times;
            </button>
            <h3 className="text-xl font-bold text-[#50B498] mb-4">
              Code Suggestion
            </h3>

            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#50B498]"></div>
              </div>
            ) : fetchError ? (
              <div className="text-red-500 p-4">{fetchError}</div>
            ) : suggestionDetail ? (
              <SuggestionDetailCard suggestion={suggestionDetail} />
            ) : (
              <p>No suggestion details available</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SuggestionTable;

/**
 * SuggestionDetailCard component displays the details of a code suggestion.
 * It shows the suggested code, status, bug detection, model, response time, and prompt.
 * @param param0 - props for the SuggestionDetailCard component
 * @param param0.suggestion - suggestion object containing details of the suggestion
 * @returns {JSX.Element} - JSX element representing the suggestion detail card
 */
export const SuggestionDetailCard = ({
  suggestion,
}: {
  suggestion: CodeSuggestion;
}) => {
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Suggested Code Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {suggestion.hasBug ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                Correct Suggestion
              </h4>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                Incorrect Suggestion
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              <pre className="bg-gray-300 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm overflow-auto max-h-64">
                {suggestion.suggestionArray[0] || "No code provided"}
              </pre>
              <pre className="bg-gray-300 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm overflow-auto max-h-64">
                {suggestion.suggestionArray[1] || "No code provided"}
              </pre>
            </div>
          </>
        ) : (
          <>
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Suggested Code
            </h4>
            <pre className="bg-gray-300 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-sm overflow-auto max-h-64">
              {suggestion.suggestionArray[0] || "No code provided"}
            </pre>
          </>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">
            Status
          </h4>
          <p
            className={suggestion.accepted ? "text-green-500" : "text-red-500"}
          >
            {suggestion.accepted ? "Accepted" : "Rejected"}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">
            Bug Detected
          </h4>
          <p>{suggestion.hasBug ? "Yes" : "No"}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">
            Model
          </h4>
          <p>{suggestion.model}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">
            Response Time
          </h4>
          <p>{suggestion.timeLapse} ms</p>
        </div>

        <div className="md:col-span-2 overflow-auto max-h-64">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Prompt
          </h4>
          <pre className="bg-gray-300 dark:bg-gray-700 p-4 rounded-md text-sm whitespace-pre-wrap">
            {suggestion.prompt}
          </pre>
        </div>
      </div>
    </div>
  );
};
