import * as vscode from 'vscode';
import { globalContext } from '../extension';
import { escapeHtml } from '../utils';

/**
 * Creates and displays a Webview panel that shows a side-by-side comparison
 * of a correct and incorrect code snippet, along with an explanation.
 *
 * This is used to help users understand suggested improvements or corrections
 * by providing a visual, interactive comparison inside VS Code.
 *
 * @param rightCode - The correct or suggested version of the code.
 * @param wrongCode - The original, incorrect version of the code.
 * @param explanation - A textual explanation describing the correction.
 */

export const createCodeComparisonWebview = (rightCode: string, wrongCode: string, explanation: string) => {
    const panel = vscode.window.createWebviewPanel(
        'codeComparison',
        'Code Comparison',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    panel.webview.html = getComparisonWebviewContent(rightCode, wrongCode, explanation);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'closeWebview':
                    panel.dispose(); // Close the webview
                    break;
            }
        },
        undefined,
        globalContext.subscriptions
    );
};

/**
 * Generates the HTML content for the code comparison Webview.
 *
 * This function returns a fully-structured HTML page that displays:
 * - The correct code snippet
 * - The incorrect code snippet
 * - An explanation for the correction
 * - A footer button that closes the Webview
 *
 * @param rightCode - The correct or improved code snippet.
 * @param wrongCode - The original, incorrect code snippet.
 * @param explanation - An explanation of why the change is necessary.
 * @returns A string containing the HTML content for the Webview.
 */
const getComparisonWebviewContent = (rightCode: string, wrongCode: string, explanation: string): string => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Comparison</title>
            <style>
                :root {
                    --container-padding: 20px;
                    --section-padding: 16px;
                    --border-radius: 8px;
                    --border-color: #e1e4e8;
                    --section-margin: 16px;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: var(--container-padding);
                    background-color: #0e0e0e;
                    color: #333;
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    box-sizing: border-box;
                }
                
                .content {
                    flex: 1;
                    overflow: auto;
                    padding-bottom: 80px;
                }
                
                .code-block {
                    background: white;
                    padding: var(--section-padding);
                    margin-bottom: var(--section-margin);
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                
                .code-content {
                    background-color: #f5f5f5;
                    font-family: 'Courier New', monospace;
                    white-space: pre-wrap;
                    padding: 12px;
                    border-radius: calc(var(--border-radius) - 2px);
                    overflow-x: auto;
                    margin-top: 8px;
                    border: 1px solid var(--border-color);
                }
                
                h3 {
                    margin: 0 0 8px 0;
                    color: #24292e;
                    font-size: 16px;
                }

                .explanation {
                    background: rgb(224, 236, 255);
                    padding: var(--section-padding);
                    margin-bottom: var(--section-margin);
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border-left: 4px solid rgb(14, 145, 2);
                }
                
                .correct-header {
                    color: #2e7d32;
                }
                
                .incorrect-header {
                    color: #c62828;
                }
                
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: #0e0e0e;
                    padding: 16px var(--container-padding);
                    display: flex;
                    justify-content: flex-end;
                    box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
                }
                
                .close-button {
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
                
                .close-button:hover {
                    background-color: #45a049;
                }
            </style>
        </head>
        <body>
            <div class="content">
                <div class="code-block">
                    <h3 class="correct-header">Correct Code</h3>
                    <div class="code-content">${escapeHtml(rightCode)}</div>
                </div>
                
                <div class="code-block">
                    <h3 class="incorrect-header">Incorrect Code</h3>
                    <div class="code-content">${escapeHtml(wrongCode)}</div>
                </div>

                <div class="explanation">
                    <h3>Explanation</h3>
                    <div>${escapeHtml(explanation)}</div>
                </div>
            </div>
            
            <div class="footer">
                <button class="close-button" id="closeButton">Got it</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const closeButton = document.getElementById('closeButton');
                
                closeButton.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'closeWebview'
                    });
                });
            </script>
        </body>
        </html>
    `;
};