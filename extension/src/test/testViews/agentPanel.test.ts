import * as vscode from 'vscode';
import { AgentPanelProvider } from '../../views/AgentPanel';
import { mocked } from 'jest-mock';

jest.mock('vscode', () => ({
  window: {
    // Common UI mocks
    showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
    showWarningMessage: jest.fn(() => Promise.resolve(undefined)),
    showErrorMessage: jest.fn(),
    withProgress: jest.fn((_opts, task) => task()),
    showInputBox: jest.fn(() => Promise.resolve('mockInput')),
    registerUriHandler: jest.fn(), 

  },
  workspace: {
    workspaceFolders: [{ name: 'mock-project', uri: { fsPath: '/mock' } }],
    onDidChangeWorkspaceFolders: jest.fn(),
  },
  commands: {
    executeCommand: jest.fn(),
    registerCommand: jest.fn(),
  },
  env: { clipboard: { writeText: jest.fn() } },
  Uri: {
    file: (p: string) => ({ fsPath: p }),
    joinPath: jest.fn(),
  },
  ProgressLocation: { Notification: 1 },
}));

jest.mock('../../services/team-service', () => ({
  getUserTeams: jest.fn().mockResolvedValue({ teams: [], error: null }),
  createTeam: jest.fn().mockResolvedValue({
    team: { id: '1', lobby_name: 'Test Team' },
    joinCode: 'ABC123',
  }),
  joinTeam: jest.fn().mockResolvedValue({
    team: { id: '1', lobby_name: 'Test Team' },
    joinCode: 'ABC123',
  }),
  deleteTeam: jest.fn().mockResolvedValue({ success: true }),
  leaveTeam: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../services/project-detection-service', () => ({
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

    // Ensure the input box always returns a valid join code
    (vscode.window.showInputBox as jest.Mock).mockResolvedValue('ABC123');

    // Ensure the joinTeam service mock returns a success object
    const teamService = require('../../services/team-service');
    teamService.joinTeam.mockResolvedValue({
    team: { id: '1', lobby_name: 'Mock Team' },
    joinCode: 'ABC123',
    });
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
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValueOnce('Copy Join Code');
    await provider.createTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Created team'),
      'Copy Join Code'
    );
  });

  it('should handle joinTeam successfully', async () => {
    // Mock input prompt with a valid join code
    (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('ABC123');

    // Mock lookupTeamByJoinCode to simulate finding the team
    const authPanel = require('../../views/AgentPanel');
    jest.spyOn(authPanel.AgentPanelProvider.prototype as any, 'lookupTeamByJoinCode')
        .mockResolvedValueOnce({ team: { id: '1', lobby_name: 'Mock Team', project_identifier: null } });

    // Mock joinTeam service result
    const teamService = require('../../services/team-service');
    teamService.joinTeam.mockResolvedValueOnce({
        team: { id: '1', lobby_name: 'Mock Team' },
        joinCode: 'ABC123',
    });

    // Run the method
    await provider.joinTeam();

    // Verify success message fired
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Successfully joined team')
    );
  });

  it('should send AI response when handleAiQuery is called', () => {
    const postSpy = jest.fn();
    (provider as any)._view = { webview: { postMessage: postSpy } };
    (provider as any).handleAiQuery('Hello');
    expect(postSpy).toHaveBeenCalledWith(expect.objectContaining({ command: 'aiResponse' }));
  });

  it('should safely handle deleting a team', async () => {
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce('Yes, Delete');
    mockContext.globalState.get = jest.fn(() => '1');
    (provider as any)._userTeams = [{ id: '1', lobby_name: 'Team1', role: 'admin' }];
    await (provider as any).handleDeleteTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it('should safely handle leaving a team', async () => {
    (vscode.window.showWarningMessage as jest.Mock).mockResolvedValueOnce('Yes, Leave');
    mockContext.globalState.get = jest.fn(() => '1');
    (provider as any)._userTeams = [{ id: '1', lobby_name: 'Team1', role: 'member' }];
    await (provider as any).handleLeaveTeam();
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });
});