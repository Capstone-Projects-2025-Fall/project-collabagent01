jest.mock("vscode");
jest.mock("child_process");

import * as vscode from "vscode";
import * as cp from "child_process";

import { GitService } from "../../services/git-service";

const mockExec = cp.exec as unknown as jest.Mock;

// Helper for mocking execAsync results
function mockExecResolve(stdout: string = "", stderr: string = "") {
  mockExec.mockImplementation((_cmd, _opts, cb) => {
    cb(null, { stdout, stderr });
  });
}

function mockExecReject(errorMessage: string) {
  mockExec.mockImplementation((_cmd, _opts, cb) => {
    const error = new Error(errorMessage);
    cb(error, null);
  });
}

describe("GitService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: "/fake/workspace" } } as any,
    ];
  });

  // ------------------------------------------------------------------
  // Constructor
  // ------------------------------------------------------------------
  test("constructor throws when no workspace is open", () => {
    (vscode.workspace as any).workspaceFolders = undefined;

    expect(() => new GitService()).toThrow("No workspace folder open");
  });

  // ------------------------------------------------------------------
  // createSessionSnapshot
  // ------------------------------------------------------------------
  test("createSessionSnapshot creates stash and returns stash name", async () => {
    const service = new GitService();

    mockExecResolve(""); // stash push succeeds

    const result = await service.createSessionSnapshot();

    expect(result).toMatch(/liveshare-session-\d+/);
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining("git stash push"),
      expect.objectContaining({ cwd: "/fake/workspace" }),
      expect.any(Function)
    );
  });

  test("createSessionSnapshot returns null when exec fails", async () => {
    const service = new GitService();

    mockExecReject("stash error");

    const result = await service.createSessionSnapshot();

    expect(result).toBeNull();
  });

  // ------------------------------------------------------------------
  // getSessionChanges
  // ------------------------------------------------------------------
  test("getSessionChanges returns git diff HEAD output when stashName not set", async () => {
    const service = new GitService();

    mockExecResolve("diff-output");

    const result = await service.getSessionChanges();

    expect(result).toBe("diff-output");
    expect(mockExec).toHaveBeenCalledWith(
      "git diff HEAD",
      expect.any(Object),
      expect.any(Function)
    );
  });

  test("getSessionChanges returns fallback when stash not found", async () => {
    const service = new GitService();
    (service as any).stashName = "stash123";

    // stash list shows nothing
    mockExecResolve("");

    const result = await service.getSessionChanges();

    expect(result).toBe("(snapshot not found - showing current changes)");
  });

  test("getSessionChanges returns diff when stash is found", async () => {
    const service = new GitService();
    (service as any).stashName = "stash123";

    mockExec
      // 1st exec: stash list
      .mockImplementationOnce((_cmd, _opts, cb) => {
        cb(null, { stdout: "stash@{0}: On stash123\n" });
      })
      // 2nd exec: diff
      .mockImplementationOnce((_cmd, _opts, cb) => {
        cb(null, { stdout: "session-diff" });
      });

    const result = await service.getSessionChanges();

    expect(result).toBe("session-diff");
  });

  test("getSessionChanges handles exec errors", async () => {
    const service = new GitService();

    mockExecReject("diff error");

    const result = await service.getSessionChanges();

    expect(result).toContain("Error getting session changes: diff error");
  });

  // ------------------------------------------------------------------
  // cleanupSessionSnapshot
  // ------------------------------------------------------------------
  test("cleanupSessionSnapshot drops stash when found", async () => {
    const service = new GitService();
    (service as any).stashName = "stash123";

    mockExec
      // stash list
      .mockImplementationOnce((_cmd, _opts, cb) => {
        cb(null, { stdout: "stash@{0}: stash123\n" });
      })
      // drop stash
      .mockImplementationOnce((_cmd, _opts, cb) => {
        cb(null, { stdout: "" });
      });

    await service.cleanupSessionSnapshot();

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining("git stash drop stash@{0}"),
      expect.any(Object),
      expect.any(Function)
    );
    expect((service as any).stashName).toBeUndefined();
  });

  test("cleanupSessionSnapshot does nothing when stashName missing", async () => {
    const service = new GitService();

    await service.cleanupSessionSnapshot();

    expect(mockExec).not.toHaveBeenCalled();
  });

  test("cleanupSessionSnapshot handles errors silently", async () => {
    const service = new GitService();
    (service as any).stashName = "stash123";

    mockExecReject("error dropping stash");

    await service.cleanupSessionSnapshot();

    // Should not throw
  });

  // ------------------------------------------------------------------
  // getChangedFilesSummary
  // ------------------------------------------------------------------
  test("getChangedFilesSummary returns empty when no stashName", async () => {
    const service = new GitService();

    const summary = await service.getChangedFilesSummary();

    expect(summary).toEqual({ fileCount: 0, files: [] });
  });

  test("getChangedFilesSummary returns empty when stash not found", async () => {
    const service = new GitService();
    (service as any).stashName = "stash123";

    mockExecResolve("");

    const summary = await service.getChangedFilesSummary();

    expect(summary).toEqual({ fileCount: 0, files: [] });
  });

  test("getChangedFilesSummary returns changed files when found", async () => {
    const service = new GitService();
    (service as any).stashName = "stash123";

    mockExec
      // stash list
      .mockImplementationOnce((_cmd, _opts, cb) => {
        cb(null, { stdout: "stash@{0}: stash123\n" });
      })
      // diff name-only
      .mockImplementationOnce((_cmd, _opts, cb) => {
        cb(null, { stdout: "file1.ts\nfile2.js\n" });
      });

    const summary = await service.getChangedFilesSummary();

    expect(summary).toEqual({
      fileCount: 2,
      files: ["file1.ts", "file2.js"],
    });
  });

  // ------------------------------------------------------------------
  // isGitRepository
  // ------------------------------------------------------------------
  test("isGitRepository returns true when rev-parse succeeds", async () => {
    const service = new GitService();

    mockExecResolve("");

    const result = await service.isGitRepository();

    expect(result).toBe(true);
  });

  test("isGitRepository returns false when rev-parse fails", async () => {
    const service = new GitService();

    mockExecReject("not a repo");

    const result = await service.isGitRepository();

    expect(result).toBe(false);
  });
});