import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class HomeScreenPanel {
    constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {}

    public async getHtml(webview: vscode.Webview, liveShareInstalled: boolean, loggedIn: boolean, userInfo?: { email?: string, username?: string }) {
        const panelStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'panel.css'));
        const homeStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'homeScreenPanel.css'));

        let liveShareStatusHtml = '';
        if (!liveShareInstalled) {
            liveShareStatusHtml = `<div class="status-block">\n                <p>Live Share extension is not installed.</p>\n                <button class="button" id="installLiveShareBtn">Install Live Share</button>\n            </div>`;
        } else {
            liveShareStatusHtml = `<div class="status-block success">\n                <p>Live Share installed</p>\n            </div>`;
        }

        let loginStatusHtml = '';
        if (!loggedIn) {
            loginStatusHtml = `<div class="status-block">\n                <p>Please sign up or log in to continue.</p>\n                <button class="button" id="loginBtn">Sign Up / Log In</button>\n            </div>`;
        } else {
            loginStatusHtml = `<div class="status-block success">\n                <p>Logged in as <strong>${userInfo?.email || userInfo?.username || 'user'}</strong></p>\n            </div>`;
        }

        const templatePath = vscode.Uri.joinPath(this.extensionUri, 'media', 'homeScreenPanel.html').fsPath;
        const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        const html = htmlTemplate
            .replace('{{PANEL_STYLE_URI}}', panelStyleUri.toString())
            .replace('{{HOME_STYLE_URI}}', homeStyleUri.toString())
            .replace('{{LIVE_SHARE_STATUS}}', liveShareStatusHtml)
            .replace('{{LOGIN_STATUS}}', loginStatusHtml);

        return html;
    }
}
