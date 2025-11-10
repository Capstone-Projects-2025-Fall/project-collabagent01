import * as vscode from 'vscode';
import { SnapshotManager } from '../views/snapshotManager';
import { createTwoFilesPatch } from 'diff';

let mockContext: any;

beforeEach(() => {
  mockContext = {
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
  };
});

jest.mock('vscode', () => ({
  window: {
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn()
  },
  workspace: {
    workspaceFolders: [{ name: 'mock-project', uri: { fsPath: '/mock/root' } }],
    onDidChangeTextDocument: jest.fn(),
    onDidCreateFiles: jest.fn(),
    onDidDeleteFiles: jest.fn(),
    onDidRenameFiles: jest.fn(),
    findFiles: jest.fn(async () => [
      { fsPath: '/mock/root/file1.txt' },
      { fsPath: '/mock/root/file2.txt' }
    ]),
    openTextDocument: jest.fn(async (uri) => ({
      getText: () => `content for ${uri.fsPath}`
    }))
  },
}));

jest.mock('path', () => ({
  relative: jest.fn((_root: string, fsPath: string) =>
    fsPath.replace('/mock/root/', '')
  )
}));

// Supabase mock
const mockSelect = jest.fn(() => Promise.resolve({ data: [{ id: 'abc123' }], error: null }));
const mockInsert = jest.fn(() => ({ select: mockSelect }));
const mockFrom = jest.fn(() => ({ insert: mockInsert }));

jest.mock('../auth/supabaseClient', () => ({
  getSupabase: jest.fn(() => ({ from: mockFrom }))
}));

// Mock getCurrentUserId
jest.mock('../services/auth-service', () => ({
  getCurrentUserId: jest.fn(async () => 'user-123')
}));

// Mock diff
jest.mock('diff', () => ({
  createTwoFilesPatch: jest.fn((f1, f2, oldText, newText) => `DIFF:${f1}:${oldText}->${newText}`)
}));

describe('SnapshotManager', () => {
  let context: any;
  let manager: SnapshotManager;

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      globalState: {
        get: jest.fn(() => 'team-1'),
        update: jest.fn()
      }
    };
    manager = new SnapshotManager(context as any);
  });

  // ─────────────────────────────
  // CORE BEHAVIOR TESTS
  // ─────────────────────────────
  it('initializes with workspace root', () => {
    expect(manager).toBeInstanceOf(SnapshotManager);
    expect((manager as any).workspaceRoot).toBe('/mock/root');
  });

  it('captureWholeWorkspace reads text files correctly', async () => {
    const snapshot = await (manager as any).captureWholeWorkspace();
    expect(Object.keys(snapshot)).toEqual(['file1.txt', 'file2.txt']);
  });

  it('computeUnifiedDiffs detects changed files', () => {
    const baseline = { 'a.txt': 'old' };
    const current = { 'a.txt': 'new' };
    const result = (manager as any).computeUnifiedDiffs(baseline, current);
    expect(result['a.txt']).toContain('DIFF:a.txt:old->new');
  });

  it('countTotalLines counts + and - correctly', () => {
    const diffMap = {
      'file1': '+++ header\n+added\n-removed\n--- footer'
    };
    const lines = (manager as any).countTotalLines(diffMap);
    expect(lines).toBe(2);
  });

  // ─────────────────────────────
  // SNAPSHOT CREATION
  // ─────────────────────────────
  it('takeSnapshot inserts baseline snapshot and shows messages', async () => {
    await manager.takeSnapshot('user-1', 'project', 'team-1');
    expect(mockInsert).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
    expect.stringContaining('✅ Initial snapshot complete')
    );
  });

  it('takeIncrementalSnapshot creates snapshot when threshold met', async () => {
    // Mock baseline
    (manager as any).baselineSnapshot = { 'file1.txt': 'before' };
    // Force big change to trigger threshold
    (manager as any).LINES_THRESHOLD = 1;
    (manager as any).FILES_THRESHOLD = 1;

    await manager.takeIncrementalSnapshot('user-1', 'team-1');
    expect(mockInsert).toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('✅ Snapshot sent to AI for analysis')
    );
  });

  it('skips incremental snapshot when no teamId', async () => {
    const spy = jest.spyOn(manager as any, 'insertNewSnapshot');
    await manager.takeIncrementalSnapshot('user-1', undefined);
    expect(spy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────
  // IDLE HANDLER
  // ─────────────────────────────
    it('onWorkspaceActivity sets idle timer and triggers snapshot', async () => {
    jest.useFakeTimers();

    const manager = new SnapshotManager(mockContext as any);

    const spy = jest.spyOn(manager, 'takeIncrementalSnapshot').mockResolvedValue();

    // Mock user + team so the timer doesn't short-circuit
    jest.spyOn(manager as any, 'requireUser').mockResolvedValue('user-1');
    (mockContext.globalState.get as jest.Mock).mockReturnValue('team-1');

    // Trigger workspace activity
    (manager as any).onWorkspaceActivity();

    // Advance the fake timers fully (simulate the 60s delay instantly)
    await jest.runAllTimersAsync?.() ?? jest.runAllTimers();

    // Let async promise chain flush
    await Promise.resolve();

    expect(spy).toHaveBeenCalled();

    jest.useRealTimers();
    });

  // ─────────────────────────────
  // LIVE SHARE INTEGRATION
  // ─────────────────────────────
  it('pauseAutomaticTracking triggers forceSavePendingChanges and pauses', async () => {
    const spy = jest.spyOn<any, any>(manager as any, 'forceSavePendingChanges').mockResolvedValue(undefined);
    await manager.pauseAutomaticTracking('user-1', 'team-1');
    expect(spy).toHaveBeenCalled();
    expect((manager as any).isAutomaticTrackingPaused).toBe(true);
  });

  it('resumeAutomaticTracking calls takeSnapshot', async () => {
    const spy = jest.spyOn(manager, 'takeSnapshot').mockResolvedValue(undefined as any);
    await manager.resumeAutomaticTracking('user-1', 'proj', 'team-1');
    expect(spy).toHaveBeenCalled();
  });

  it('createSessionBaseline inserts baseline snapshot and returns id', async () => {
    const id = await manager.createSessionBaseline('user-1', 'team-1', 'sess-9');
    expect(id).toBe('abc123');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('captureSessionChanges computes diffs and clears sessionBaseline', async () => {
    (manager as any).sessionBaselineSnapshot = { 'a.txt': 'old' };
    const result = await manager.captureSessionChanges('user-1', 'team-1');
    expect(result).toContain('=== a.txt ===');
    expect((manager as any).sessionBaselineSnapshot).toBeNull();
  });
});