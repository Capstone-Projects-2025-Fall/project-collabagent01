import * as vscode from "vscode";
import { globalContext } from "../extension";
import { submitCode } from "../api/suggestion-api";
import { LogData, LogEvent } from "../api/types/event";
import { SuggestionContext } from "../api/types/suggestion";
import { trackEvent } from "../api/log-api";
import { getAuthContext } from "../services/auth-service";
import { escapeHtml } from "../utils";

/**
 * Creates and displays a Webview panel where users can review a faulty code snippet,
 * receive a hint, edit the code to correct it, and submit their fix for evaluation.
 *
 * Tracks user interactions, including time taken to submit a fix, and logs the outcome
 * (correct or incorrect) to the backend for analytics.
 *
 * @param wrongCode - The original code snippet containing a potential issue.
 * @param hint - A textual hint provided to assist the user in fixing the code.
 * @param suggestionContext - Metadata about the suggestion, used for logging and analytics.
 */
export const createCodeCorrectionWebview = (
  wrongCode: string,
  hint: string,
  suggestionContext: SuggestionContext
) => {
  const startTime = Date.now();
  const panel = vscode.window.createWebviewPanel(
    "codeCorrection",
    "Code Review & Fix",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case "submitFix":
          const fixedCode = message.code;
          const elapsedTime = Date.now() - startTime;

          const result = await submitCode(
            wrongCode,
            fixedCode,
            suggestionContext.prompt ?? ""
          );

          panel.webview.postMessage({
            command: "showResult",
            result: result
              ? "Your fix is correct! ✅"
              : "Your fix is incorrect. ❌",
          });

          const { context: user, error } = await getAuthContext();
          if (error || user === undefined) {
            console.error(
              "Failed to get user context for logging suggestion event."
            );
            return;
          }
          const userId = user.id;

          const logData: LogData = {
            event: result
              ? LogEvent.USER_ANSWER_CORRECT
              : LogEvent.USER_ANSWER_INCORRECT,
            timeLapse: elapsedTime,
            metadata: {
              user_id: userId,
              suggestion_id: suggestionContext.suggestionId,
              has_bug: suggestionContext.hasBug,
            },
          };

          trackEvent(logData);

          break;
      }
    },
    undefined,
    globalContext.subscriptions
  );

  panel.webview.html = getCorrectionWebviewContent(wrongCode, hint);
};

/**
 * Generates the HTML content for the Code Correction Webview panel.
 *
 * This view allows users to:
 * - Review the provided faulty code snippet
 * - Read a helpful hint
 * - Edit the code directly in a textarea editor
 * - Submit their fix and receive immediate feedback
 *
 * @param wrongCode - The original buggy code snippet to be reviewed.
 * @param hint - A hint designed to guide users toward the correct solution.
 * @returns A string containing the full HTML content for the Webview.
 */
const getCorrectionWebviewContent = (
  wrongCode: string,
  hint: string
): string => {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Review & Fix</title>
            <style>
                :root {
                    --container-padding: 20px;
                    --section-padding: 16px;
                    --border-radius: 8px;
                    --border-color: #e1e4e8;
                    --section-margin: 12px;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: var(--container-padding);
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    color: #333;
                    background-color: #0e0e0e;
                    box-sizing: border-box;
                }
                
                .content {
                    flex: 1;
                    overflow: auto;
                    padding-bottom: 80px; /* Space for fixed footer */
                }
                
                .section {
                    background: white;
                    padding: var(--section-padding);
                    margin-bottom: var(--section-margin);
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                
                .code-section {
                    background-color: #f5f5f5;
                    font-family: 'Courier New', monospace;
                    white-space: pre;
                    padding: 12px;
                    border-radius: var(--border-radius);
                    overflow-x: auto;
                    color: #333;
                    border: 1px solid var(--border-color);
                    margin-top: 8px;
                }
                
                .explanation {
                    background-color: #fff8e1;
                    border-left: 4px solid #ffc107;
                }
                
                .code-editor {
                    min-height: 200px;
                    width: 100%;
                    font-family: 'Courier New', monospace;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    padding: 12px;
                    resize: vertical;
                    background-color: #f8f8f8;
                    color: #333;
                    margin-top: 8px;
                    box-sizing: border-box;
                }
                
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 16px var(--container-padding);
                    display: flex;
                    justify-content: flex-end;
                    box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
                }
                
                .submit-button {
                    padding: 8px 24px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                
                .submit-button:hover {
                    background-color: #45a049;
                }

                .submit-button:disabled {
                    background-color: #a5d6a7;
                    cursor: not-allowed;
                }
                
                h3 {
                    margin: 0 0 8px 0;
                    color: #24292e;
                    font-size: 16px;
                }
                
                #resultContainer {
                    display: none;
                    padding: var(--section-padding);
                    background-color: #e8f5e9;
                    border-left: 4px solid #4CAF50;
                    border-radius: var(--border-radius);
                    margin: var(--section-margin) 0;
                }
            </style>
        </head>
        <body>
            <div class="content">
                <div class="section">
                    <h3>Code With Potential Issues</h3>
                    <div class="code-section">${escapeHtml(wrongCode)}</div>
                </div>

                <div class="section explanation">
                    <h3>Hint:</h3>
                    <p>${hint}</p>
                </div>

                <div class="section">
                    <h3>Fix the Code</h3>
                    <textarea id="codeEditor" class="code-editor">${escapeHtml(
                      wrongCode
                    )}</textarea>
                </div>

                <div id="resultContainer"></div>
            </div>

            <div class="footer">
                <button class="submit-button" id="submitButton">Submit</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const submitButton = document.getElementById('submitButton');
                const codeEditor = document.getElementById('codeEditor');
                const resultContainer = document.getElementById('resultContainer');

                submitButton.addEventListener('click', () => {
                    submitButton.disabled = true; 
                    submitButton.textContent = "Submitting...";

                    const fixedCode = codeEditor.value;
                    vscode.postMessage({
                        command: 'submitFix',
                        code: fixedCode
                    });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'showResult') {
                        resultContainer.style.display = 'block';
                        resultContainer.innerHTML = \`
                            <h3>Result</h3>
                            <p>\${message.result}</p>
                        \`;
                        resultContainer.scrollIntoView({ behavior: 'smooth' });

                        submitButton.textContent = "Submit";
                    }
                });
            </script>
        </body>
        </html>
    `;
};
