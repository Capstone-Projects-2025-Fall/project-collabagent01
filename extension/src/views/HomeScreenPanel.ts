import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class HomeScreenPanel {
    constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {}

    public async getHtml(webview: vscode.Webview, liveShareInstalled: boolean, loggedIn: boolean, userInfo?: { email?: string, username?: string }) {
        const panelStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'panel.css'));
        const homeStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'homeScreenPanel.css'));
        const profileStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'profilePanel.css'));

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

        // Add profile content when authenticated
        let profileHtml = '';
        if (loggedIn) {
            profileHtml = `
            <div class="profile-section">
                <div class="profile-header">
                    <h3>Profile Settings</h3>
                </div>

                <div class="profile-form">
                    <div class="form-section">
                        <label for="profile-name" class="form-label">Name</label>
                        <input type="text" id="profile-name" class="form-input" placeholder="Enter your name" />
                    </div>

                    <div class="form-section">
                        <div class="section-header">
                            <label class="form-label">Interests & Strengths</label>
                            <div class="section-actions">
                                <div class="info-icon-wrapper">
                                    <svg class="info-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
                                        <text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">i</text>
                                    </svg>
                                    <div class="tooltip">
                                        Select your skills so AI can effectively assign Jira Tasks!
                                    </div>
                                </div>
                                <button id="clear-skills-btn" class="button secondary" type="button">Clear</button>
                            </div>
                        </div>
                        <div class="checkbox-grid">
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Java" />
                                <span>Java</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Python" />
                                <span>Python</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="TypeScript" />
                                <span>TypeScript</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="JavaScript" />
                                <span>JavaScript</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="C++" />
                                <span>C++</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="C#" />
                                <span>C#</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Swift" />
                                <span>Swift</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Frontend" />
                                <span>Frontend</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Backend" />
                                <span>Backend</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Database" />
                                <span>Database</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="UI/UX" />
                                <span>UI/UX</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="DevOps" />
                                <span>DevOps</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Cloud" />
                                <span>Cloud</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Security" />
                                <span>Security</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Testing" />
                                <span>Testing</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="API" />
                                <span>API</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Documentation" />
                                <span>Documentation</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" name="interests" value="Debugging" />
                                <span>Debugging</span>
                            </label>
                        </div>
                        <div class="custom-input-section">
                            <input type="text" id="custom-interests" class="form-input" placeholder="Add other interests (comma-separated)" />
                        </div>
                    </div>

                    <div class="form-actions">
                        <div class="action-group">
                            <button id="save-profile-btn" class="button primary">Save Profile</button>
                            <button id="delete-account-btn" class="button danger">Delete Account</button>
                        </div>
                        <span id="profile-status" class="status-message"></span>
                    </div>
                </div>

                <!-- Delete Account Confirmation Modal -->
                <div id="delete-modal" class="modal" style="display: none;">
                    <div class="modal-overlay"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Delete Account</h3>
                            <button class="modal-close" id="modal-close-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p class="modal-warning">This action cannot be undone. All your data will be permanently deleted.</p>
                            <p class="modal-instruction">To confirm, please type <strong>DELETE</strong> below:</p>
                            <input type="text" id="delete-confirmation-input" class="form-input" placeholder="Type DELETE to confirm" autocomplete="off" />
                            <p id="delete-error" class="delete-error" style="display: none;">Please type DELETE to confirm</p>
                        </div>
                        <div class="modal-footer">
                            <button id="modal-cancel-btn" class="button secondary">Cancel</button>
                            <button id="modal-confirm-btn" class="button danger" disabled>Delete My Account</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        const templatePath = vscode.Uri.joinPath(this.extensionUri, 'media', 'homeScreenPanel.html').fsPath;
        const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

        const html = htmlTemplate
            .replace('{{PANEL_STYLE_URI}}', panelStyleUri.toString())
            .replace('{{HOME_STYLE_URI}}', homeStyleUri.toString())
            .replace('{{PROFILE_STYLE_URI}}', profileStyleUri.toString())
            .replace('{{LIVE_SHARE_STATUS}}', liveShareStatusHtml)
            .replace('{{LOGIN_STATUS}}', loginStatusHtml)
            .replace('{{PROFILE_CONTENT}}', profileHtml);

        return html;
    }
}
