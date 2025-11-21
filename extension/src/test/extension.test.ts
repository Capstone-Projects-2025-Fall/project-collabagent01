import * as vscode from 'vscode';
import * as vsls from 'vsls';

const registeredCommands: Record<string, (...args: any[]) => any> = {};

jest.mock('vscode', () => {
  const showInformationMessage = jest.fn();
  const showWarningMessage = jest.fn();
  const showErrorMessage = jest.fn();
  const registerWebviewViewProvider = jest.fn(() => ({ dispose: jest.fn() }));
  const registerUriHandler = jest.fn(() => ({ dispose: jest.fn() }));
  const createStatusBarItem = jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    text: '',
    command: '',
    dispose: jest.fn(),
  }));

  const executeCommand = jest.fn();

  const registerCommand = jest.fn(
    (id: string, callback: (...args: any[]) => any) => {
      registeredCommands[id] = callback;
      return { dispose: jest.fn() };
    }
  );

  return {
    window: {
      showInformationMessage,
      showWarningMessage,
      showErrorMessage,
      registerWebviewViewProvider,
      registerUriHandler,
      createStatusBarItem,
    },
    workspace: {
      workspaceFolders: [{ name: 'mock-project', uri: { fsPath: '/mock' } }],
      onDidCreateFiles: jest.fn(),
    },
    commands: {
      executeCommand,
      registerCommand,
      _registeredCommands: registeredCommands,
    },
    Uri: {
      file: (p: string) => ({ fsPath: p }),
      parse: (s: string) => ({ toString: () => s }),
    },
    StatusBarAlignment: { Left: 1, Right: 2 },
    env: {
      openExternal: jest.fn(),
    },
  };
});

jest.mock('vsls', () => ({
  getApi: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../auth/supabaseClient', () => ({
  getSupabase: jest.fn(() => ({
    auth: {
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
  })),
}));

jest.mock('../commands/auth-commands', () => ({
  signInCommand: { dispose: jest.fn() },
  signOutCommand: { dispose: jest.fn() },
  createAuthStatusBarItem: jest.fn(() => ({ dispose: jest.fn() })),
}));

jest.mock('../services/auth-service', () => ({
  checkUserSignIn: jest.fn(),
  getCurrentUserId: jest.fn(async () => 'user-1'),
}));

jest.mock('../commands/github-token-commands', () => ({
  setGitHubTokenCommand: { dispose: jest.fn() },
  clearGitHubTokenCommand: { dispose: jest.fn() },
  checkGitHubTokenCommand: { dispose: jest.fn() },
}));

jest.mock('../views/MainPanel', () => ({
  CollabAgentPanelProvider: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../services/profile-service', () => ({
  setDisplayNameExplicit: jest.fn(async () => {}),
  getOrInitDisplayName: jest.fn(async () => 'User'),
}));

jest.mock('../commands/team-project-commands', () => ({
  validateCurrentProjectCommand: { dispose: jest.fn() },
  showCurrentProjectInfoCommand: { dispose: jest.fn() },
  updateTeamProjectCommand: { dispose: jest.fn() },
  checkTeamProjectCompatibilityCommand: { dispose: jest.fn() },
  openTeamProjectCommand: { dispose: jest.fn() },
}));

jest.mock('../commands/jira-commands', () => ({
  connectToJiraCommand: jest.fn(),
  createJiraStatusBarItem: jest.fn(() => ({ dispose: jest.fn() })),
}));

jest.mock('../services/project-detection-service', () => ({
  getCurrentProjectInfo: jest.fn(() => ({
    projectName: 'mock-project',
    localPath: '/mock',
    projectHash: 'hash',
    isGitRepo: true,
    remoteUrl: 'git@github.com:mock/mock.git',
  })),
}));

let snapshotInstance: any;
jest.mock('../views/snapshotManager', () => ({
  SnapshotManager: jest.fn().mockImplementation((_ctx: any) => {
    snapshotInstance = {
      userTriggeredSnapshot: jest.fn().mockResolvedValue(undefined),
      publishSnapshot: jest.fn().mockResolvedValue(undefined),
    };
    return snapshotInstance;
  }),
}));

jest.mock('../services/github-verification-service', () => ({
  storeGitHubAccessToken: jest.fn(async () => {}),
}));

describe('extension activate/deactivate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(registeredCommands).forEach((k) => delete registeredCommands[k]);
  });

  async function loadAndActivate() {
    const extension = await import('../extension.js');
    const activate = extension.activate;
    const context = {
      extensionUri: vscode.Uri.file('/ext'),
      subscriptions: [],
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as any;
    await activate(context);
    return { extension, context };
  }

  it('activates without throwing and registers commands', async () => {
    const { context } = await loadAndActivate();

    // Snapshot manager created
    expect(snapshotInstance).toBeDefined();

    // setContext called
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'collabAgent.showPanel',
      true
    );

    // Team view provider registered
    expect(
      vscode.window.registerWebviewViewProvider
    ).toHaveBeenCalledWith(
      'collabAgent.teamActivity',
      expect.any(Object)
    );

    // Subscriptions populated
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });

  it('userSnapshot command warns if user is not signed in', async () => {
    const auth = require('../services/auth-service');
    (auth.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

    await loadAndActivate();

    const commandsMap = (vscode.commands as any)
      ._registeredCommands as typeof registeredCommands;

    await commandsMap['collabAgent.userSnapshot']();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Please sign in before taking a snapshot.'
    );
    expect(snapshotInstance.userTriggeredSnapshot).not.toHaveBeenCalled();
  });

  it('userSnapshot command triggers snapshot when signed in', async () => {
    const auth = require('../services/auth-service');
    (auth.getCurrentUserId as jest.Mock).mockResolvedValueOnce('user-1');

    await loadAndActivate();

    const commandsMap = (vscode.commands as any)
      ._registeredCommands as typeof registeredCommands;

    await commandsMap['collabAgent.userSnapshot']();

    expect(snapshotInstance.userTriggeredSnapshot).toHaveBeenCalledWith(
      'user-1',
      'mock-project'
    );
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Manual snapshot saved for project!'
    );
  });

  it('publishSnapshot warns when user not signed in', async () => {
    const auth = require('../services/auth-service');
    (auth.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

    await loadAndActivate();

    const commandsMap = (vscode.commands as any)
      ._registeredCommands as typeof registeredCommands;

    await commandsMap['collabAgent.publishSnapshot']();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'You must be signed in to publish a snapshot.'
    );
    expect(snapshotInstance.publishSnapshot).not.toHaveBeenCalled();
  });

  it('publishSnapshot calls snapshot manager when signed in', async () => {
    const auth = require('../services/auth-service');
    (auth.getCurrentUserId as jest.Mock).mockResolvedValueOnce('user-1');

    await loadAndActivate();

    const commandsMap = (vscode.commands as any)
      ._registeredCommands as typeof registeredCommands;

    await commandsMap['collabAgent.publishSnapshot']();

    expect(snapshotInstance.publishSnapshot).toHaveBeenCalledWith(
      'user-1',
      'mock-project'
    );
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Snapshot published successfully!'
    );
  });

  it('deactivate does not throw', async () => {
    const { extension } = await loadAndActivate();
    expect(() => extension.deactivate()).not.toThrow();
  });
});