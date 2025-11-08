import * as vscode from 'vscode';
import { TasksPanel } from '../views/TasksPanel';

// ─────────────────────────────
// Mock VS Code + Node modules
// ─────────────────────────────
jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  workspace: {},
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<div>Mock HTML</div>'),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

// ─────────────────────────────
// Mock JiraService singleton
// ─────────────────────────────
const mockFetchTeamIssues = jest.fn();
const mockFetchSprints = jest.fn();
const mockFetchSprintIssues = jest.fn();
const mockFetchBacklogIssues = jest.fn();
const mockFetchTransitions = jest.fn();
const mockTransitionIssue = jest.fn();
const mockCreateIssue = jest.fn();
const mockInitiateJiraAuth = jest.fn();
const mockGetJiraConfig = jest.fn();

const jiraInstance = {
  fetchTeamIssues: mockFetchTeamIssues,
  fetchSprints: mockFetchSprints,
  fetchSprintIssues: mockFetchSprintIssues,
  fetchBacklogIssues: mockFetchBacklogIssues,
  fetchTransitions: mockFetchTransitions,
  transitionIssue: mockTransitionIssue,
  createIssue: mockCreateIssue,
  initiateJiraAuth: mockInitiateJiraAuth,
  getJiraConfig: mockGetJiraConfig,
};
jest.mock('../services/jira-service', () => ({
  JiraService: {
    getInstance: jest.fn(() => jiraInstance)
  }
}));

// ─────────────────────────────
// Mock dependent services
// ─────────────────────────────
jest.mock('../services/team-service', () => ({
  getUserTeams: jest.fn(async () => ({
    teams: [{ id: 't1', role: 'admin' }]
  }))
}));

jest.mock('../services/auth-service', () => ({
  getAuthContext: jest.fn(async () => ({ context: { id: 'user123' } }))
}));

describe('TasksPanel', () => {
  let context: any;
  let panel: TasksPanel;
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPost = jest.fn();
    context = {
      extensionPath: '/mock/ext',
      globalState: {
        get: jest.fn(() => 't1'),
        update: jest.fn()
      }
    };

    panel = new TasksPanel(context as any);
    panel['setWebview']({
      webview: { postMessage: mockPost, onDidReceiveMessage: jest.fn() }
    } as any);
  });

  // ─────────────────────────────
  // BASIC TESTS
  // ─────────────────────────────
  it('should load HTML and JS successfully', () => {
    const html = panel.getHtml();
    expect(html).toContain('<div>Mock HTML</div>');
  });

  it('should initialize panel and call updateUI after delay', async () => {
    const spy = jest.spyOn<any, any>(panel as any, 'updateUI');
    await panel.initializePanel();
    await new Promise((r) => setTimeout(r, 150));
    expect(spy).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // UI LOGIC TESTS
  // ─────────────────────────────
  it('updateUI shows setup UI for admin with Jira not configured', async () => {
    panel['_currentTeamId'] = 't1';
    panel['_currentUserRole'] = 'admin';
    panel['_jiraConfigured'] = false;
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      showSetup: true,
      statusText: 'Setup required'
    }));
  });

  it('updateUI shows waiting UI for non-admin', async () => {
    panel['_currentTeamId'] = 't1';
    panel['_currentUserRole'] = 'member';
    panel['_jiraConfigured'] = false;
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      showWaiting: true,
      statusText: 'Waiting for admin setup'
    }));
  });

  it('updateUI shows error UI if no team', async () => {
    panel['_currentTeamId'] = null;
    panel['_currentUserRole'] = null;
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      showError: true
    }));
  });

  it('updateUI shows tasks UI if Jira configured', async () => {
    panel['_currentTeamId'] = 't1';
    panel['_currentUserRole'] = 'admin';
    panel['_jiraConfigured'] = true;
    const loadTasksSpy = jest.spyOn(panel, 'loadTasks').mockResolvedValue();
    const loadSprintsSpy = jest.spyOn(panel, 'loadSprints').mockResolvedValue();
    (panel as any).updateUI();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      showTasks: true,
      statusText: 'Loading tasks...'
    }));
    expect(loadTasksSpy).toHaveBeenCalled();
    expect(loadSprintsSpy).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // TASK & SPRINT LOADING
  // ─────────────────────────────
  it('loadTasks posts fetched issues', async () => {
    mockFetchTeamIssues.mockResolvedValue([{ key: 'ABC-1' }]);
    await panel.loadTasks();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      tasks: [{ key: 'ABC-1' }],
      showTasks: true
    }));
  });

  it('loadTasks posts error message on failure', async () => {
    mockFetchTeamIssues.mockRejectedValue(new Error('Boom'));
    await panel.loadTasks();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      showError: true,
      errorMessage: 'Boom'
    }));
  });

  it('loadSprints posts sprint data', async () => {
    mockFetchSprints.mockResolvedValue([{ id: 1, name: 'Sprint 1' }]);
    panel['_jiraConfigured'] = true;
    await panel.loadSprints();
    expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
      command: 'updateSprints'
    }));
  });

  // ─────────────────────────────
  // HANDLE CONNECT JIRA
  // ─────────────────────────────
  it('handleConnectJira initiates Jira auth for admin', async () => {
    mockGetJiraConfig.mockResolvedValue({});
    await panel.handleConnectJira();
    expect(mockInitiateJiraAuth).toHaveBeenCalled();
  });

  it('handleConnectJira shows error on failure', async () => {
    mockInitiateJiraAuth.mockRejectedValue(new Error('Auth failed'));
    await panel.handleConnectJira();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Auth failed')
    );
  });

  // ─────────────────────────────
  // ISSUE TRANSITION
  // ─────────────────────────────
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

  // ─────────────────────────────
  // CREATE TASK
  // ─────────────────────────────
  it('handleCreateTask posts success and refreshes', async () => {
    mockCreateIssue.mockResolvedValue({ key: 'ABC-123' });
    const spy = jest.spyOn(panel, 'handleRefreshTasks').mockResolvedValue();
    await panel.handleCreateTask({ summary: 'New Task' });
    expect(mockPost).toHaveBeenCalledWith({ command: 'taskCreated' });
    expect(spy).toHaveBeenCalled();
  });

  it('handleCreateTask posts failure message', async () => {
    mockCreateIssue.mockRejectedValue(new Error('Bad'));
    await panel.handleCreateTask({ summary: 'Bad Task' });
    expect(mockPost).toHaveBeenCalledWith({ command: 'taskCreationFailed' });
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Bad')
    );
  });
});