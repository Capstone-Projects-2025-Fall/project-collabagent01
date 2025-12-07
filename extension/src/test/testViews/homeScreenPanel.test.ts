import * as vscode from 'vscode';
import * as fs from 'fs';
import { HomeScreenPanel } from '../../views/HomeScreenPanel';

jest.mock('fs');

// Mock Webview
const mockWebview = {
    asWebviewUri: jest.fn((uri) => uri),
} as any as vscode.Webview;

// Mock ExtensionContext
const mockContext = {
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
    },
} as any as vscode.ExtensionContext;

describe('HomeScreenPanel', () => {
    const mockExtensionUri = vscode.Uri.file('/extension');
    let panel: HomeScreenPanel;

    beforeEach(() => {
        panel = new HomeScreenPanel(mockExtensionUri, mockContext);
        (fs.readFileSync as jest.Mock).mockReturnValue(`
            <html>
                <head>
                    <link href="{{PANEL_STYLE_URI}}" />
                    <link href="{{HOME_STYLE_URI}}" />
                </head>
                <body>
                    {{LIVE_SHARE_STATUS}}
                    {{LOGIN_STATUS}}
                </body>
            </html>
        `);
    });

    test('shows Live Share not installed button when liveShareInstalled is false', async () => {
        const html = await panel.getHtml(mockWebview, false, false);
        expect(html).toContain('Install Live Share');
    });

    test('shows Live Share installed status when liveShareInstalled is true', async () => {
        const html = await panel.getHtml(mockWebview, true, false);
        expect(html).toContain('Live Share installed');
    });

    test('shows login button when user is not logged in', async () => {
        const html = await panel.getHtml(mockWebview, true, false);
        expect(html).toContain('Sign in with GitHub');
    });

    test('shows user email when logged in', async () => {
        const html = await panel.getHtml(mockWebview, true, true, { email: 'test@example.com' });
        expect(html).toContain('Logged in as <strong>test@example.com</strong>');
    });

    test('injects styles properly from template', async () => {
        const html = await panel.getHtml(mockWebview, true, true);
        expect(html).toContain('panel.css');
        expect(html).toContain('homeScreenPanel.css');
    });

    test('reads HTML template file', async () => {
        await panel.getHtml(mockWebview, true, false);
        expect(fs.readFileSync).toHaveBeenCalled();
    });
});
