import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(cp.exec);

/**
 * Service for Git operations during Live Share sessions
 * Uses file content snapshots to track changes made DURING the session
 */
export class GitService {
    private workspaceRoot: string;
    private stashName?: string;

    constructor() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }
        this.workspaceRoot = workspaceFolders[0].uri.fsPath;
    }

    /**
     * Creates a snapshot of the current working directory state at session start
     * Uses git stash to save everything (including untracked files)
     * @returns The stash reference name
     */
    async createSessionSnapshot(): Promise<string | null> {
        try {
            const timestamp = Date.now();
            this.stashName = `liveshare-session-${timestamp}`;

            // Create a stash with all changes (including untracked files)
            // Using --keep-index to not affect the working directory
            await execAsync(`git stash push -u -k -m "${this.stashName}"`, {
                cwd: this.workspaceRoot
            });

            console.log('[GitService] Created session snapshot:', this.stashName);
            return this.stashName;
        } catch (error: any) {
            console.error('[GitService] Error creating snapshot:', error);
            return null;
        }
    }

    /**
     * Gets the diff of changes made DURING the session
     * Compares current state against the session start snapshot
     * @returns Git diff showing only changes made during the session
     */
    async getSessionChanges(): Promise<string> {
        try {
            if (!this.stashName) {
                // Fallback: just show current uncommitted changes
                const { stdout } = await execAsync('git diff HEAD', {
                    cwd: this.workspaceRoot,
                    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
                });
                return stdout || '(no changes detected)';
            }

            // Find the stash index
            const { stdout: stashList } = await execAsync('git stash list', {
                cwd: this.workspaceRoot
            });

            const stashIndex = stashList.split('\n')
                .findIndex(line => line.includes(this.stashName!));

            if (stashIndex === -1) {
                return '(snapshot not found - showing current changes)';
            }

            // Get diff from stash to current working directory
            const { stdout } = await execAsync(`git diff stash@{${stashIndex}}`, {
                cwd: this.workspaceRoot,
                maxBuffer: 10 * 1024 * 1024
            });

            return stdout || '(no changes during session)';
        } catch (error: any) {
            console.error('[GitService] Error getting session changes:', error);
            return `Error getting session changes: ${error.message}`;
        }
    }

    /**
     * Cleans up the session snapshot stash
     */
    async cleanupSessionSnapshot(): Promise<void> {
        try {
            if (!this.stashName) {
                return;
            }

            // Find and drop the stash
            const { stdout: stashList } = await execAsync('git stash list', {
                cwd: this.workspaceRoot
            });

            const stashIndex = stashList.split('\n')
                .findIndex(line => line.includes(this.stashName!));

            if (stashIndex !== -1) {
                await execAsync(`git stash drop stash@{${stashIndex}}`, {
                    cwd: this.workspaceRoot
                });
                console.log('[GitService] Cleaned up session snapshot');
            }

            this.stashName = undefined;
        } catch (error: any) {
            console.error('[GitService] Error cleaning up snapshot:', error);
        }
    }

    /**
     * Gets a summary of changed files during the session
     * @returns Object with file counts and list of changed files
     */
    async getChangedFilesSummary(): Promise<{ fileCount: number; files: string[] }> {
        try {
            if (!this.stashName) {
                return { fileCount: 0, files: [] };
            }

            const { stdout: stashList } = await execAsync('git stash list', {
                cwd: this.workspaceRoot
            });

            const stashIndex = stashList.split('\n')
                .findIndex(line => line.includes(this.stashName!));

            if (stashIndex === -1) {
                return { fileCount: 0, files: [] };
            }

            const { stdout } = await execAsync(`git diff --name-only stash@{${stashIndex}}`, {
                cwd: this.workspaceRoot
            });

            const files = stdout.trim().split('\n').filter(f => f.length > 0);

            return {
                fileCount: files.length,
                files
            };
        } catch (error: any) {
            console.error('[GitService] Error getting changed files:', error);
            return {
                fileCount: 0,
                files: []
            };
        }
    }

    /**
     * Checks if the current directory is a git repository
     * @returns true if git repo, false otherwise
     */
    async isGitRepository(): Promise<boolean> {
        try {
            await execAsync('git rev-parse --git-dir', {
                cwd: this.workspaceRoot
            });
            return true;
        } catch {
            return false;
        }
    }
}
