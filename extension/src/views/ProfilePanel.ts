import * as vscode from 'vscode';
import * as fs from 'fs';

export class ProfilePanel {
    constructor(
        private readonly extensionUri: vscode.Uri, 
        private readonly context: vscode.ExtensionContext
    ) {}

    public async getHtml(webview: vscode.Webview): Promise<string> {
        const profileStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'profilePanel.css')
        );

        const templatePath = vscode.Uri.joinPath(
            this.extensionUri, 
            'media', 
            'profilePanel.html'
        ).fsPath;
        
        let htmlTemplate = '';
        try {
            htmlTemplate = fs.readFileSync(templatePath, 'utf8');
        } catch (e) {
            console.error('Failed to read profilePanel.html:', e);
            return '<div>Failed to load profile panel.</div>';
        }

        const html = htmlTemplate
            .replace('{{PROFILE_STYLE_URI}}', profileStyleUri.toString());

        return html;
    }
}
