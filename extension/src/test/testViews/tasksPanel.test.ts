import * as vscode from 'vscode';
import { TasksPanel } from '../../views/TasksPanel';

// ------------------------------
// GLOBAL MOCKS
// ------------------------------
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<html><body>Mock HTML</body></html>'),
}));

jest.mock('path', () => ({
  join: jest.fn(() => '/mock/path'),
}));

// ✅ Full stable JiraService mock
const mockFetchTeamIssues = jest.fn();
const mockFetchSprints = jest.fn();
const mockFetchTransitions = jest.fn();
const mockTransitionIssue = jest.fn();
const mockCreateIssue = jest.fn();
const mockInitiateJiraAuth = jest.fn();
const mockGetJiraConfig = jest.fn();

jest.mock('../../services/jira-service', () => ({
  JiraService: {
    getInstance: jest.fn(() => ({
      fetchTeamIssues: mockFetchTeamIssues,
      fetchSprints: mockFetchSprints,
      fetchTransitions: mockFetchTransitions,
      transitionIssue: mockTransitionIssue,
      createIssue: mockCreateIssue,
      initiateJiraAuth: mockInitiateJiraAuth,
      getJiraConfig: mockGetJiraConfig,
    })),
  },
}));

// ✅ Mock auth-service for Jira connection
jest.mock('../../services/auth-service', () => ({
  getAuthContext: jest.fn(() => Promise.resolve({ context: { id: 'user-1' } })),
}));

// ✅ Mock team-service to simulate a current team
jest.mock('../../services/team-service', () => ({
  getUserTeams: jest.fn(() =>
    Promise.resolve({
      teams: [{ id: 'team-1', role: 'admin' }],
      error: null,
    })
  ),
}));

// ------------------------------
// TEST SETUP
// ------------------------------
describe('TasksPanel', () => {
  let panel: TasksPanel;
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPost = jest.fn();

    // Create a fake VSCode webview
    const mockWebviewView = {
      webview: {
        postMessage: mockPost,
        onDidReceiveMessage: jest.fn(),
      },
    } as any;

    // Minimal mock context with a globalState getter/setter
    const mockContext = {
      extensionPath: '/mock/extension',
      globalState: {
        get: jest.fn(() => 'team-1'),
        update: jest.fn(),
      },
    } as any;

    panel = new TasksPanel(mockContext);
    panel.setWebview(mockWebviewView);
    // Manually set required state
    (panel as any)._currentTeamId = 'team-1';
    (panel as any)._view = mockWebviewView;
  });

  // ------------------------------
  // TESTS
  // ------------------------------

  it('should load HTML and JS successfully', () => {
    const html = panel.getHtml();
    expect(html).toContain('<html>');
  });

  it('should initialize panel and call updateUI after delay', async () => {
    jest.useFakeTimers(); // start fake timer mode

    const spy = jest.spyOn(panel as any, 'updateUI').mockImplementation();

    await panel.initializePanel();

    // advance all timers or jump 200ms forward
    jest.advanceTimersByTime(200);

    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
    jest.useRealTimers(); // cleanup timer mocks
  });

  it('updateUI shows setup UI for admin with Jira not configured', async () => {
    (panel as any)._jiraConfigured = false;
    (panel as any)._currentUserRole = 'admin';
    (panel as any)._view = { webview: { postMessage: mockPost } };
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({ showSetup: true })
    );
  });

  it('updateUI shows waiting UI for non-admin', async () => {
    (panel as any)._jiraConfigured = false;
    (panel as any)._currentUserRole = 'member';
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({ showWaiting: true })
    );
  });

  it('updateUI shows error UI if no team', async () => {
    (panel as any)._currentTeamId = null;
    (panel as any)._currentUserRole = null;
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({ showError: true })
    );
  });

  it('updateUI shows tasks UI if Jira configured', async () => {
    (panel as any)._jiraConfigured = true;
    (panel as any)._currentUserRole = 'admin';
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({ showTasks: true })
    );
  });

  it('loadTasks posts fetched issues', async () => {
    (panel as any)._jiraConfigured = true;
    mockFetchTeamIssues.mockResolvedValue([{ key: 'ABC-1' }]);

    await panel.loadTasks();

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        showTasks: true,
        tasks: [{ key: 'ABC-1' }],
      })
    );
  });

  it('loadTasks posts error message on failure', async () => {
    (panel as any)._jiraConfigured = true;
    mockFetchTeamIssues.mockRejectedValue(new Error('Boom'));

    await panel.loadTasks();

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        showError: true,
        errorMessage: 'Boom',
      })
    );
  });

  it('loadSprints posts sprint data', async () => {
    (panel as any)._jiraConfigured = true;
    mockFetchSprints.mockResolvedValue([{ id: 1, name: 'Sprint 1' }]);
    await panel.loadSprints();
    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'updateSprints' })
    );
  });

  it('handleConnectJira initiates Jira auth for admin', async () => {
    (panel as any)._currentUserRole = 'admin';
    (panel as any)._jiraConfigured = false;

    mockGetJiraConfig.mockResolvedValue({});
    await panel.handleConnectJira();

    expect(mockInitiateJiraAuth).toHaveBeenCalled();
  });

  it('handleConnectJira shows error on failure', async () => {
    (panel as any)._currentUserRole = 'admin';
    mockInitiateJiraAuth.mockRejectedValue(new Error('Auth failed'));

    await panel.handleConnectJira();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Auth failed')
    );
  });

  it('handleTransitionIssue performs valid transition', async () => {
    mockFetchTransitions.mockResolvedValue([{ id: 1, to: { name: 'Done' } }]);
    await panel.handleTransitionIssue('TASK-1', 'Done');
    expect(mockTransitionIssue).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('TASK-1')
    );
  });

  it('handleTransitionIssue shows error for invalid transition', async () => {
    mockFetchTransitions.mockResolvedValue([{ id: 1, to: { name: 'In Progress' } }]);
    await panel.handleTransitionIssue('TASK-2', 'Done');
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Cannot transition')
    );
  });

  it('handleCreateTask posts success and refreshes', async () => {
    (panel as any)._jiraConfigured = true;
    mockCreateIssue.mockResolvedValue({ key: 'JIRA-123' });

    const spy = jest.spyOn(panel, 'handleRefreshTasks').mockResolvedValue();

    await panel.handleCreateTask({ summary: 'New Task' });

    expect(mockPost).toHaveBeenCalledWith({ command: 'taskCreated' });
    expect(spy).toHaveBeenCalled();
  });

  it('handleCreateTask posts failure message', async () => {
    (panel as any)._jiraConfigured = true;
    mockCreateIssue.mockRejectedValue(new Error('Bad'));

    await panel.handleCreateTask({ summary: 'Bad Task' });

    expect(mockPost).toHaveBeenCalledWith({ command: 'taskCreationFailed' });
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Bad')
    );
  });
});