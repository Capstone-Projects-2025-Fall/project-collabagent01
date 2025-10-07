import * as vscode from 'vscode';

export class HomeScreenPanel {
    constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {}

    public async getHtml(webview: vscode.Webview, liveShareInstalled: boolean, loggedIn: boolean, userInfo?: { email?: string, username?: string }) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'panel.css'));
        const nonce = Date.now().toString();
        let liveShareStatusHtml = '';
        if (!liveShareInstalled) {
            liveShareStatusHtml = `<div class="status-block">
                <p>Live Share extension is not installed.</p>
                <button class="button" id="installLiveShareBtn">Install Live Share</button>
            </div>`;
        } else {
            liveShareStatusHtml = `<div class="status-block success">
                <p>Live Share installed</p>
            </div>`;
        }
        let loginStatusHtml = '';
        if (!loggedIn) {
            loginStatusHtml = `<div class="status-block">
                <p>Please sign up or log in to continue.</p>
                <button class="button" id="loginBtn">Sign Up / Log In</button>
            </div>`;
        } else {
            loginStatusHtml = `<div class="status-block success">
                <p>Logged in as <strong>${userInfo?.email || userInfo?.username || 'user'}</strong></p>
            </div>`;
        }
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Collab Agent Home</title>
            <link href="${styleUri}" rel="stylesheet" />
            <style>
                body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    min-height: 100vh;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    padding: 0 0 0 0;
                    font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
                    box-sizing: border-box;
                    width: 100vw;
                    max-width: 100%;
                }
                .panel-content {
                    flex: 1 1 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                    padding: 2vw 0;
                }
                .welcome {
                    margin-top: 2.5vw;
                    margin-bottom: 2vw;
                    text-align: left;
                    width: 100%;
                    max-width: 600px;
                    background: var(--vscode-sideBarSectionHeader-background);
                    border-radius: 10px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
                    padding: 2vw 3vw 1.5vw 3vw;
                    border-left: 0.4vw solid #4f8cff;
                    box-sizing: border-box;
                    transition: padding 0.2s, margin 0.2s;
                }
                .welcome-title {
                    font-size: clamp(1.3em, 2.2vw, 2.2em);
                    font-weight: 700;
                    letter-spacing: -1px;
                    color: #4f8cff;
                    margin-bottom: 0.7vw;
                    font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
                    transition: font-size 0.2s;
                }
                .welcome-desc {
                    font-size: clamp(1em, 1.18vw, 1.18em);
                    color: var(--vscode-editor-foreground);
                    margin-bottom: 0.7vw;
                    font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
                    transition: font-size 0.2s;
                }
                .welcome-options {
                    font-size: clamp(0.95em, 1.08vw, 1.08em);
                    color: var(--vscode-descriptionForeground);
                    margin-top: 1vw;
                    transition: font-size 0.2s;
                }
                .status-block {
                    margin: 1.5vw 0;
                    padding: 1.2vw 2vw;
                    background: var(--vscode-sideBar-background);
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    text-align: left;
                    width: 100%;
                    max-width: 600px;
                    box-sizing: border-box;
                    transition: padding 0.2s, margin 0.2s;
                }
                .status-block.success {
                    background: var(--vscode-sideBarSectionHeader-background);
                    color: var(--vscode-sideBarSectionHeader-foreground);
                }
                .button {
                    margin-top: 0.8vw;
                    padding: 0.6vw 2vw;
                    font-size: clamp(0.9em, 1vw, 1em);
                    border-radius: 6px;
                    border: none;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    cursor: pointer;
                    font-weight: 500;
                    transition: font-size 0.2s, padding 0.2s;
                }
                .button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                @media (max-width: 500px) {
                    .welcome, .status-block {
                        max-width: 98vw;
                        padding: 4vw 2vw 2vw 2vw;
                        margin-top: 2vw;
                        margin-bottom: 2vw;
                    }
                    .welcome-title, .welcome-desc, .welcome-options {
                        font-size: 1em !important;
                    }
                    .button {
                        font-size: 0.95em !important;
                        padding: 2vw 4vw;
                    }
                }
            </style>
        </head>
        <body>
            <div class="panel-content">
                <div class="welcome">
                    <div class="welcome-title">Welcome to Collab Agent</div>
                    <div class="welcome-desc">Collaboration made easy.<br>To get started, please install Live Share and log in.</div>
                    <div class="welcome-options">For <strong>real-time collaboration</strong>, choose <span style="color:#4f8cff;font-weight:600;">Live Share</span>.<br>For <strong>async collaboration</strong>, choose <span style="color:#4f8cff;font-weight:600;">Agent</span>.</div>
                </div>
                ${liveShareStatusHtml}
                ${loginStatusHtml}
            </div>
        </body>
        </html>`;
    }
}
