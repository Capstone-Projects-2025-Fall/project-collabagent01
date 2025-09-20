import { useState } from "react";

/**
 * CopyButton component that allows users to copy text to the clipboard.
 * @param text - The text to be copied to the clipboard.
 * @returns {JSX.Element} The CopyButton component.
 */
export const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // Reset after 1.5s
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-sm bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-700 rounded-md text-text transition-all"
    >
      <div className="inline-flex items-center">
        {/* SVG Icon for Copy */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#e3e3e3"
        >
          <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z" />
        </svg>
        {copied ? "Copied!" : text}
      </div>
    </button>
  );
};

/**
 * Download component that provides options for downloading the CLOVER extension.
 * Includes a link to a getting started guide
 * and options for installation from the VS Code, VS Code Marketplace or manual installation.
 * @returns {JSX.Element} The Download component.
 */
export const Download = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center width-container">
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center text-center px-6 mt-6 pb-12">
        <h1 className="text-5xl font-extrabold text-text">
          Download{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#50B498] to-[#9CDBA6]">
            CLOVER
          </span>
        </h1>
        <p className="mt-4 text-lg text-text max-w-2xl">
          Get started with CLOVER, the AI-powered coding assistant for Visual
          Studio Code. Choose the installation method that works best for you.
        </p>

        {/* Download Options */}
        <h2 className="text-3xl font-bold text-[#50B498]">Download Options</h2>
        <a
          href="/getting-started"
          className="mt-4 text-lg text-blue-600 dark:text-blue-400 hover:underline"
        >
          Need help? View the full setup guide →
        </a>

        {/* VS Code Marketplace */}
        <div className="info-card p-6 rounded-2xl shadow-lg mt-6 w-full max-w-3xl">
          <h3 className="text-xl font-bold text-text">Install from VS Code</h3>
          <p className="text-text mt-2">
            Install CLOVER directly from the VS Code or the VS Code Marketplace.
          </p>
          <div className="flex flex-col items-center gap-4 mt-4">
            <a
              href="vscode:extension/capstone-team-2.temple-capstone-clover"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block bg-blue-400 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-700 hover:scale-105 text-white font-bold py-2 px-4 rounded transition-all"
            >
              Open in VS Code
            </a>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=capstone-team-2.temple-capstone-clover"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block bg-blue-400 dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 hover:scale-105 text-white font-bold py-2 px-4 rounded transition-all"
            >
              Open in VS Code Marketplace
            </a>
          </div>
        </div>

        {/* Manual Installation */}
        {/* <div className="info-card p-6 rounded-2xl shadow-lg mt-6 w-full max-w-3xl">
          <h3 className="text-xl font-bold text-text">Manual Installation</h3>
          <p className="text-text mt-2">
            If you prefer, you can download the VSIX file and install it
            manually.
          </p>
          <a
            href="https://api.nickrucinski.com/download"
            download
            className="mt-4 inline-block bg-green-400 dark:bg-green-500 hover:bg-green-500 dark:hover:bg-green-700 hover:scale-105 text-white font-bold py-2 px-4 rounded transition-all"
          >
            Download VSIX File
          </a>
          <div className="p-2 rounded-lg">
            <p className="text-text mt-2">
              After downloading, you can run{" "}
              <CopyButton text={"code --install-extension clover.vsix"} /> in
              the your terminal where the file is located to install the
              extension.
            </p>
          </div>
        </div> */}
      </section>
    </div>
  );
};

export default Download;
