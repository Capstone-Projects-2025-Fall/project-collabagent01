import * as vscode from 'vscode';
import { AgentPanelProvider } from '../views/AgentPanel';
import { mocked } from 'jest-mock';

jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn().mockResolvedValue(undefined),
    showWarningMessage: jest.fn().mockResolvedValue(undefined),
    showInputBox: jest.fn().mockResolvedValue('Mock Input'),
    withProgress: jest.fn((_, task) => task())
  },
  workspace: {
    workspaceFolders: [{ name: 'mock-project', uri: { fsPath: '/mock/path' } }],
    onDidChangeWorkspaceFolders: jest.fn()
  },
  commands: {
    executeCommand: jest.fn()
  },
  ProgressLocation: { Notification: 1 },
  Uri: {
    joinPath: jest.fn(),
  },
  env: {
    clipboard: { writeText: jest.fn() }
  }
}));

jest.mock('../services/team-service', () => ({
  createTeam: jest.fn(async () => ({ team: { id: '1', lobby_name: 'Team1' }, joinCode: 'ABC123' })),
  joinTeam: jest.fn(async () => ({ team: { id: '2', lobby_name: 'Team2' }, joinCode: 'XYZ789' })),
  getUserTeams: jest.fn(async () => ({ teams: [{ id: '1', lobby_name: 'Team1', role: 'admin' }] })),
  deleteTeam: jest.fn(async () => ({ success: true })),
  leaveTeam: jest.fn(async () => ({ success: true }))
}));

jest.mock('../services/project-detection-service', () => ({
  validateCurrentProject: jest.fn(() => ({ isMatch: true })),
  getCurrentProjectInfo: jest.fn(() => ({ isGitRepo: true })),
  getProjectDescription: jest.fn(() => 'mock-project')
}));

describe('AgentPanelProvider', () => {
  let provider: AgentPanelProvider;
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      globalState: {
        get: jest.fn(),
        update: jest.fn()
      }
    };
    provider = new AgentPanelProvider(vscode.Uri.file('/mock'), mockContext as any);
  });

  it('should instantiate without errors', () => {
    expect(provider).toBeInstanceOf(AgentPanelProvider);
  });

  it('should call refreshTeams and update state', async () => {
    const refreshSpy = jest.spyOn<any, any>(provider as any, 'refreshTeams');
    await provider.refreshTeamsList();
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should handle createTeam successfully', async () => {
    await provider.createTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Created team'),
      'Copy Join Code'
    );
  });

  it('should handle joinTeam successfully', async () => {
    await provider.joinTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Successfully joined team')
    );
  });

  it('should post team info safely even with no webview', async () => {
    expect(() => (provider as any).postTeamInfo()).not.toThrow();
  });

  it('should send AI response when handleAiQuery is called', () => {
    const postSpy = jest.fn();
    (provider as any)._view = { webview: { postMessage: postSpy } };
    (provider as any).handleAiQuery('Hello');
    expect(postSpy).toHaveBeenCalledWith(expect.objectContaining({ command: 'aiResponse' }));
  });

  it('should safely handle deleting a team', async () => {
    mockContext.globalState.get = jest.fn(() => '1');
    (provider as any)._userTeams = [{ id: '1', lobby_name: 'Team1', role: 'admin' }];
    await (provider as any).handleDeleteTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it('should safely handle leaving a team', async () => {
    mockContext.globalState.get = jest.fn(() => '1');
    (provider as any)._userTeams = [{ id: '1', lobby_name: 'Team1', role: 'member' }];
    await (provider as any).handleLeaveTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
});