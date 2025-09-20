import { BASE_ENDPOINT } from "../api/endpoints";

/**
 * DataDownload component allows admins to download all data.
 * It provides a button that triggers the download of all data in JSON format.
 * @returns {JSX.Element} - A React component that renders a button to download all data.
 */
export const DataDownload = () => {
  return (
    <div>
      <div className="card bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-4 overflow-y-auto">
        <h2 className="text-lg pb-6">Download Data</h2>
        <div className="mb-4">
          <a href={`${BASE_ENDPOINT}/export`} className="button-gray">
            Download All Data
          </a>
        </div>
      </div>
    </div>
  );
};

export default DataDownload;
