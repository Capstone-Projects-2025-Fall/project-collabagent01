import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class HomeScreenPanel {
    constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {}

    public async getHtml(webview: vscode.Webview, liveShareInstalled: boolean, loggedIn: boolean, userInfo?: { email?: string, username?: string }) {
        const cacheBuster = Date.now();
        const panelStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'panel.css'));
        const homeStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'homeScreenPanel.css'));

        let liveShareStatusHtml = '';
        if (!liveShareInstalled) {
            liveShareStatusHtml = `<div class="status-block">
                <p>Live Share extension is not installed.</p>
                <button class="home-button" id="installLiveShareBtn">Install Live Share</button>
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
                <button class="home-button" id="loginBtn">Sign Up / Log In</button>
            </div>`;
        } else {
            loginStatusHtml = `<div class="status-block success">
                <p>Logged in as <strong>${userInfo?.email || userInfo?.username || 'user'}</strong></p>
            </div>`;
        }

        const templatePath = vscode.Uri.joinPath(this.extensionUri, 'media', 'homeScreenPanel.html').fsPath;
        const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        const html = htmlTemplate
            .replace('{{PANEL_STYLE_URI}}', `${panelStyleUri.toString()}?v=${cacheBuster}`)
            .replace('{{HOME_STYLE_URI}}', `${homeStyleUri.toString()}?v=${cacheBuster}`)
            .replace('{{LIVE_SHARE_STATUS}}', liveShareStatusHtml)
            .replace('{{LOGIN_STATUS}}', loginStatusHtml);

        return html;
    }
}
