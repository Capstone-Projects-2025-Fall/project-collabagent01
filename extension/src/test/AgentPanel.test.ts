import 'jest';
import * as vscode from 'vscode';

// Mock the team-service module
jest.mock('../services/team-service', () => ({
    getUserTeams: jest.fn(),
    createTeam: jest.fn(),
    joinTeam: jest.fn()
}));

// Mock the project-detection-service module  
jest.mock('../services/project-detection-service', () => ({
    validateCurrentProject: jest.fn(),
    getCurrentProjectInfo: jest.fn(),
    getProjectDescription: jest.fn()
}));

import { AgentPanelProvider } from '../views/AgentPanel';
import { getUserTeams, createTeam, joinTeam } from '../services/team-service';

describe('AgentPanelProvider (unit)', () => {
    let provider: AgentPanelProvider;
    let mockContext: Partial<vscode.ExtensionContext>;
    let mockUri: vscode.Uri;
    let mockWebviewView: Partial<vscode.WebviewView>;
    let webviewPostMessage: jest.Mock;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock VS Code workspace
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: { fsPath: '/test/path' } }],
            writable: true
        });

        // VS Code methods are mocked in __mocks__/vscode.ts

        // Mock extension context
        mockContext = {
            globalState: {
                get: jest.fn(),
                update: jest.fn()
            } as any,
            extensionUri: vscode.Uri.parse('file:///test')
        };

        mockUri = vscode.Uri.parse('file:///test');

        // Mock webview
        webviewPostMessage = jest.fn();
        mockWebviewView = {
            webview: {
                options: {},
                html: '',
                postMessage: webviewPostMessage,
                onDidReceiveMessage: jest.fn(),
                asWebviewUri: jest.fn().mockReturnValue('mock-uri')
            } as any
        };

        provider = new AgentPanelProvider(mockUri, mockContext as any);
    });

    describe('resolveWebviewView', () => {
        test('should initialize webview with correct options', async () => {
            const getUserTeamsMock = getUserTeams as jest.MockedFunction<typeof getUserTeams>;
            getUserTeamsMock.mockResolvedValue({ teams: [] });

            await provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);

            expect(mockWebviewView.webview!.options).toEqual({
                enableScripts: true,
                localResourceRoots: [mockUri]
            });
            expect(mockWebviewView.webview!.html).toBeDefined();
        });

        test('should call refreshTeams during initialization', async () => {
            const getUserTeamsMock = getUserTeams as jest.MockedFunction<typeof getUserTeams>;
            getUserTeamsMock.mockResolvedValue({ teams: [] });

            await provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);

            expect(getUserTeamsMock).toHaveBeenCalled();
        });
    });

    describe('refreshTeams', () => {
        test('should load teams successfully and update UI', async () => {
            const mockTeams = [
                { 
                    id: '1', 
                    lobby_name: 'Team 1', 
                    role: 'admin' as 'admin' | 'member', 
                    join_code: 'ABC123',
                    created_by: 'user1',
                    created_at: '2025-01-01',
                    project_identifier: 'hash1',
                    project_repo_url: 'https://github.com/test/repo1',
                    project_name: 'Repo 1'
                }
            ];

            const getUserTeamsMock = getUserTeams as jest.MockedFunction<typeof getUserTeams>;
            getUserTeamsMock.mockResolvedValue({ teams: mockTeams });

            // Set up webview
            (provider as any)._view = mockWebviewView;

            await (provider as any).refreshTeams();

            expect(getUserTeamsMock).toHaveBeenCalled();
            expect((provider as any)._userTeams).toEqual(mockTeams);
        });

        test('should handle error when loading teams fails', async () => {
            const getUserTeamsMock = getUserTeams as jest.MockedFunction<typeof getUserTeams>;
            getUserTeamsMock.mockResolvedValue({ error: 'Database error' });

            const showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage');

            await (provider as any).refreshTeams();

            expect(showErrorMessageSpy).toHaveBeenCalledWith('Failed to load teams: Database error');
        });
    });

    describe('postTeamInfo', () => {
        beforeEach(() => {
            (provider as any)._view = mockWebviewView;
        });

        test('should show no team when no teams available', () => {
            (provider as any)._userTeams = [];

            (provider as any).postTeamInfo();

            expect(webviewPostMessage).toHaveBeenCalledWith({
                command: 'updateTeamInfo',
                team: { 
                    name: 'No Team', 
                    role: '—', 
                    joinCode: '', 
                    id: '' 
                },
                allTeams: []
            });
        });

        test('should post current team info when team is selected', () => {
            const mockTeam = { 
                id: '1', 
                lobby_name: 'Test Team', 
                role: 'admin' as 'admin' | 'member', 
                join_code: 'ABC123',
                project_identifier: 'hash123',
                project_repo_url: 'https://github.com/test/repo',
                created_by: 'user1',
                created_at: '2025-01-01',
                project_name: 'Test Project'
            };

            (provider as any)._userTeams = [mockTeam];
            (mockContext.globalState!.get as jest.Mock).mockReturnValue('1');

            (provider as any).postTeamInfo();

            expect(webviewPostMessage).toHaveBeenCalledWith({
                command: 'updateTeamInfo',
                team: {
                    name: 'Test Team',
                    role: 'Admin',
                    joinCode: 'ABC123',
                    id: '1'
                },
                allTeams: [{
                    id: '1',
                    name: 'Test Team',
                    role: 'Admin',
                    joinCode: 'ABC123'
                }]
            });
        });
    });

    describe('handleCreateTeam', () => {
        test('should create team successfully with valid input', async () => {
            // Mock the showInputBox to return a team name
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('New Team');

            const createTeamMock = createTeam as jest.MockedFunction<typeof createTeam>;
            createTeamMock.mockResolvedValue({ 
                team: { 
                    id: '1', 
                    lobby_name: 'New Team',
                    created_by: 'user1',
                    join_code: 'JOIN123',
                    created_at: '2025-01-01',
                    project_identifier: 'hash123'
                },
                joinCode: 'JOIN123'
            });

            const refreshTeamsSpy = jest.spyOn(provider as any, 'refreshTeams').mockImplementation();
            
            // Mock withProgress to execute the task immediately
            (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, task) => {
                return await task({} as any, {} as any);
            });

            // Mock showInformationMessage to return undefined (no button clicked)
            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

            await (provider as any).handleCreateTeam();

            expect(createTeamMock).toHaveBeenCalledWith('New Team');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Created team "New Team" with join code: JOIN123',
                'Copy Join Code'
            );
            expect(refreshTeamsSpy).toHaveBeenCalled();
        });

        test('should handle cancelled input', async () => {
            // Mock showInputBox to return undefined (user cancelled)
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

            const createTeamMock = createTeam as jest.MockedFunction<typeof createTeam>;
            
            await (provider as any).handleCreateTeam();

            // Should not call createTeam when input is cancelled
            expect(createTeamMock).not.toHaveBeenCalled();
        });
    });

    describe('handleJoinTeam', () => {
        test('should join team successfully with valid join code', async () => {
            // Mock showInputBox to return join code
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('ABC123');

            const mockTeam = {
                id: 'team123',
                lobby_name: 'Test Team',
                project_identifier: 'hash123',
                project_repo_url: 'https://github.com/test/repo',
                created_by: 'user1',
                join_code: 'JOIN123',
                created_at: '2025-01-01'
            };

            const joinTeamMock = joinTeam as jest.MockedFunction<typeof joinTeam>;
            joinTeamMock.mockResolvedValue({ team: mockTeam });

            const refreshTeamsSpy = jest.spyOn(provider as any, 'refreshTeams').mockImplementation();

            // Mock withProgress to execute the task immediately
            (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, task) => {
                return await task({} as any, {} as any);
            });

            await (provider as any).handleJoinTeam();

            expect(joinTeamMock).toHaveBeenCalledWith('ABC123');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Successfully joined team "Test Team"');
            expect(refreshTeamsSpy).toHaveBeenCalled();
        });

        test('should handle invalid join code', async () => {
            // Mock showInputBox to return invalid code
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('INVALID');

            const joinTeamMock = joinTeam as jest.MockedFunction<typeof joinTeam>;
            joinTeamMock.mockResolvedValue({ error: 'Invalid join code' });

            // Mock withProgress to execute the task immediately
            (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, task) => {
                return await task({} as any, {} as any);
            });

            await (provider as any).handleJoinTeam();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to join team: Invalid join code');
        });
    });

    describe('handleSwitchTeam', () => {
        test('should show message when user has no teams', async () => {
            (provider as any)._userTeams = [];

            const showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation();

            await (provider as any).handleSwitchTeam();

            expect(showInformationMessageSpy).toHaveBeenCalledWith('You are not a member of any teams. Create or join a team first.');
        });

        test('should show message when user has only one team', async () => {
            (provider as any)._userTeams = [{ id: '1', lobby_name: 'Only Team', role: 'admin' }];

            const showInformationMessageSpy = jest.spyOn(vscode.window, 'showInformationMessage').mockImplementation();

            await (provider as any).handleSwitchTeam();

            expect(showInformationMessageSpy).toHaveBeenCalledWith('You only belong to one team.');
        });
    });
});