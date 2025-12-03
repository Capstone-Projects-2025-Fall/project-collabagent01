import * as vscode from 'vscode';
import { CollabAgentPanelProvider } from '../../views/MainPanel';
import { HomeScreenPanel } from '../../views/HomeScreenPanel';
import { AgentPanelProvider } from '../../views/AgentPanel';
import { LiveShareManager } from '../../views/LiveSharePanel';

// Mock fs module
jest.mock('fs', () => ({
    readFileSync: jest.fn(() => '<html><body>{{HOME_HTML}}{{LIVESHARE_HTML}}{{AGENT_HTML}}{{TASKS_HTML}}{{PROFILE_HTML}}</body></html>')
}));

// Mock sub-views
jest.mock('../../views/HomeScreenPanel', () => ({
    HomeScreenPanel: jest.fn().mockImplementation(() => ({
        getHtml: jest.fn().mockResolvedValue('<div>Home Screen</div>')
    }))
}));

jest.mock('../../views/AgentPanel', () => ({
    AgentPanelProvider: jest.fn().mockImplementation(() => ({
        getInnerHtml: jest.fn().mockReturnValue('<div>Agent Panel</div>'),
        setWebviewForDelegation: jest.fn(),
        createTeam: jest.fn().mockResolvedValue(undefined),
        refreshTeamsList: jest.fn().mockResolvedValue(undefined)
    }))
}));

jest.mock('../../views/LiveSharePanel', () => ({
    LiveShareManager: jest.fn().mockImplementation(() => ({
        setView: jest.fn(),
        updateTeamActivity: jest.fn(),
        startLiveShareSession: jest.fn(),
        initializeLiveShare: jest.fn().mockResolvedValue(undefined),
        dispose: jest.fn()
    }))
}));

jest.mock('../../views/TasksPanel', () => ({
    TasksPanel: jest.fn().mockImplementation(() => ({
        getHtml: jest.fn().mockReturnValue('<div>Tasks Panel</div>'),
        setWebview: jest.fn(),
        initializePanel: jest.fn().mockResolvedValue(undefined)
    }))
}));

jest.mock('../../views/ProfilePanel', () => ({
    ProfilePanel: jest.fn().mockImplementation(() => ({
        getHtml: jest.fn().mockResolvedValue('<div>Profile Panel</div>')
    }))
}));

// Mock auth-service
jest.mock('../../services/auth-service', () => ({
    getAuthContext: jest.fn().mockResolvedValue({ context: { isAuthenticated: true, email: 'test@example.com', first_name: 'TestUser' } }),
    signInOrUpMenu: jest.fn().mockResolvedValue(undefined)
}));

describe('CollabAgentPanelProvider', () => {
    let extensionUri: vscode.Uri;
    let context: vscode.ExtensionContext;
    let webviewView: any;

    beforeEach(() => {
        extensionUri = vscode.Uri.file('/fake/path');
        context = {} as any;

        webviewView = {
            webview: {
                options: {},
                html: '',
                asWebviewUri: jest.fn(uri => uri),
                postMessage: jest.fn(),
                onDidReceiveMessage: jest.fn()
            }
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should instantiate without errors', () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        expect(panel).toBeInstanceOf(CollabAgentPanelProvider);
    });

    it('should resolve webview and set HTML', async () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        const htmlPromise = panel['resolveWebviewView'](webviewView, {} as any, {} as any);
        await expect(htmlPromise).resolves.not.toThrow();
        expect(webviewView.webview.html).toBeDefined();
    });

    it('should delegate Live Share commands', async () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        const liveShareManager = (panel as any)._liveShareManager;
        liveShareManager.startLiveShareSession = jest.fn();
        await panel['handleLiveShareMessage']({ command: 'startLiveShare' });
        expect(liveShareManager.startLiveShareSession).toHaveBeenCalled();
    });

    it('should delegate Agent commands', async () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        const agentPanel = (panel as any)._agentPanel;
        agentPanel.createTeam = jest.fn().mockResolvedValue(undefined);
        await panel['handleAgentMessage']({ command: 'createTeam' });
        expect(agentPanel.createTeam).toHaveBeenCalled();
    });

    it('should handle login/signup command', async () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        (panel as any)._view = webviewView;
        await expect(panel['handleLoginOrSignup']()).resolves.not.toThrow();
    });

    it('should handle Live Share installation command', async () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        (panel as any)._view = webviewView;
        vscode.commands.executeCommand = jest.fn().mockResolvedValue(undefined);
        vscode.window.showInformationMessage = jest.fn();
        await expect(panel['handleInstallLiveShare']()).resolves.not.toThrow();
        expect(webviewView.webview.postMessage).toHaveBeenCalledWith({ command: 'liveShareInstalling' });
    });

    it('should update team activity via Live Share manager', () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        const liveShareManager = (panel as any)._liveShareManager;
        liveShareManager.updateTeamActivity = jest.fn();
        panel.updateTeamActivity({ foo: 'bar' });
        expect(liveShareManager.updateTeamActivity).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should dispose without errors', () => {
        const panel = new CollabAgentPanelProvider(extensionUri, context);
        panel.dispose();
        expect((panel as any)._view).toBeUndefined();
    });
});
