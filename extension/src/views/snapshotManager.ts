// snapshotManager.ts
import * as vscode from "vscode";
import * as path from "path";
import { SupabaseClient } from "@supabase/supabase-js";
import { createTwoFilesPatch } from "diff"; // ensure `diff` is installed
import { getCurrentUserId } from "../services/auth-service";
import { getSupabase } from "../auth/supabaseClient";

type FileMap = Record<string, string>;

export class SnapshotManager {
  private supabase: SupabaseClient;
  private idleTimer: NodeJS.Timeout | null = null;
  private IDLE_DELAY = 60_000; // 60s idle window (increased from 30s)

  // Thresholds for creating new snapshots
  private LINES_THRESHOLD = 50;  // Minimum lines changed
  private FILES_THRESHOLD = 5;   // Minimum files changed

  /** The original/baseline snapshot of the whole workspace (first full capture) */
  private baselineSnapshot: FileMap | null = null;

  /** Session baseline snapshot for Live Share sessions (host only) */
  private sessionBaselineSnapshot: FileMap | null = null;

  /** Flag to track if automatic snapshotting is paused (during Live Share) */
  private isAutomaticTrackingPaused: boolean = false;

  /** Workspace root path for relative path conversion */
  private workspaceRoot: string;

  constructor(private context: vscode.ExtensionContext) {
    this.supabase = getSupabase();

    // Initialize workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    this.workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';

    vscode.workspace.onDidChangeTextDocument(() => this.onWorkspaceActivity());
    vscode.workspace.onDidCreateFiles(() => this.onWorkspaceActivity());
    vscode.workspace.onDidDeleteFiles(() => this.onWorkspaceActivity());
    vscode.workspace.onDidRenameFiles(() => this.onWorkspaceActivity());
  }

  // ——————————————————————
  // Public APIs you already call
  // ——————————————————————

  /** Initial full snapshot (called when team is selected) */
  public async takeSnapshot(userId: string, projectName: string, teamId?: string) {
    // Require teamId for snapshot
    if (!teamId) {
      console.warn('[SnapshotManager] No team selected - skipping snapshot');
      vscode.window.showWarningMessage('Please select a team before taking snapshots');
      return;
    }

    vscode.window.showInformationMessage('📸 Taking initial workspace snapshot...');

    const snapshot = await this.captureWholeWorkspace();

    // Save baseline in memory
    this.baselineSnapshot = snapshot;

    // Write to DB: snapshot (all files), clear changes
    await this.insertNewSnapshot(userId, projectName, teamId, snapshot, {});

    const fileCount = Object.keys(snapshot).length;
    vscode.window.showInformationMessage(`✅ Initial snapshot complete: ${fileCount} files captured`);
    console.log("Full workspace snapshot saved.");
  }

  /** Idle-based incremental snapshot: recompute ALL changes vs baseline and check thresholds */
  public async takeIncrementalSnapshot(userId: string, teamId?: string) {
    // Require teamId for snapshot
    if (!teamId) {
      console.log('[SnapshotManager] No team selected - skipping incremental snapshot');
      return;
    }

    // We require a baseline snapshot to compare against.
    if (!this.baselineSnapshot) {
      // No baseline yet? Create one now (e.g., first run after opening project).
      const projectName = this.getProjectName();
      await this.takeSnapshot(userId, projectName, teamId);
      return;
    }

    const projectName = this.getProjectName();
    const current = await this.captureWholeWorkspace();

    // Build merged diffs vs the ORIGINAL baseline, per file
    const mergedChanges = this.computeUnifiedDiffs(this.baselineSnapshot, current);

    // Check if changes meet threshold
    const filesChanged = Object.keys(mergedChanges).length;
    const linesChanged = this.countTotalLines(mergedChanges);

    console.log(`[SnapshotManager] Changes detected: ${filesChanged} files, ${linesChanged} lines`);

    // Only create snapshot if threshold is met
    if (linesChanged >= this.LINES_THRESHOLD || filesChanged >= this.FILES_THRESHOLD) {
      vscode.window.showInformationMessage(
        `📸 Capturing snapshot: ${filesChanged} files, ${linesChanged} lines changed`
      );

      // Create NEW row with ONLY changes (not full workspace)
      // Pass empty object {} for snapshot to save space
      await this.insertNewSnapshot(userId, projectName, teamId, {}, mergedChanges);

      vscode.window.showInformationMessage(
        `✅ Snapshot sent to AI for analysis`
      );

      // Update baseline to current state
      this.baselineSnapshot = current;

      console.log("Incremental snapshot saved and sent to AI.");
    } else {
      console.log(`[SnapshotManager] Threshold not met (need ${this.LINES_THRESHOLD} lines or ${this.FILES_THRESHOLD} files). Skipping snapshot.`);
    }
  }

  // ——————————————————————
  // Idle handling
  // ——————————————————————
  private onWorkspaceActivity() {
    // Don't start idle timer if automatic tracking is paused
    if (this.isAutomaticTrackingPaused) {
      console.log('[SnapshotManager] Automatic tracking paused - ignoring workspace activity');
      return;
    }

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(async () => {
      const userId = await this.requireUser();
      // Use the same key as AgentPanel (collabAgent.currentTeam)
      const teamId = this.context.globalState.get<string>('collabAgent.currentTeam');
      console.log('[SnapshotManager] Idle timer fired - teamId:', teamId);
      if (userId) await this.takeIncrementalSnapshot(userId, teamId);
    }, this.IDLE_DELAY);
  }

  // ——————————————————————
  // Core helpers
  // ——————————————————————

  /** Capture ALL text files in the workspace (not just open editors). */
  private async captureWholeWorkspace(): Promise<FileMap> {
    const files: FileMap = {};

    if (!vscode.workspace.workspaceFolders?.length) return files;

    // Skip common noise
    const exclude =
      "{**/.git/**,**/node_modules/**,**/.vscode/**,**/dist/**,**/out/**," +
      "**/*.png,**/*.jpg,**/*.jpeg,**/*.gif,**/*.svg,**/*.pdf,**/*.ico," +
      "**/*.zip,**/*.gz,**/*.tar,**/*.lock,**/*.min.js}";

    // Capture up to ~10k files—adjust if you need more/less
    const uris = await vscode.workspace.findFiles("**/*", exclude, 10000);

    // Read each as text; errors are ignored (binarys etc)
    for (const uri of uris) {
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        // Use RELATIVE paths for portability across machines
        const relativePath = this.workspaceRoot
          ? path.relative(this.workspaceRoot, uri.fsPath)
          : uri.fsPath;
        files[relativePath] = doc.getText();
      } catch {
        // Ignore unreadable files
      }
    }
    return files;
  }

  /** Compute a map: filePath -> unified diff string, comparing current against baseline. */
  private computeUnifiedDiffs(baseline: FileMap, current: FileMap): Record<string, string> {
    const changed: Record<string, string> = {};
    const seen = new Set<string>([...Object.keys(baseline), ...Object.keys(current)]);

    for (const file of seen) {
      const oldText = baseline[file] ?? "";
      const newText = current[file] ?? "";
      if (oldText === newText) continue;

      // Unified diff (shows + and - clearly, and handles add/delete/edit)
      const patch = createTwoFilesPatch(file, file, oldText, newText, "baseline", "current");
      changed[file] = patch;
    }

    return changed;
  }

  /**
   * Insert a NEW snapshot row (not upsert) so edge function triggers on each insert
   * This allows AI to summarize each work session separately
   */
  private async insertNewSnapshot(
    userId: string,
    projectName: string,
    teamId: string,
    snapshot: FileMap,
    changes: Record<string, string>
  ) {
    const payload = {
      user_id: userId,
      team_id: teamId, // Fixed: using team_id instead of project_name
      project_name: projectName,
      snapshot: snapshot,
      changes: changes,
      updated_at: new Date().toISOString(),
    };

    console.log("[DB INSERT] Creating new snapshot row...");

    const { data, error } = await this.supabase
      .from("file_snapshots")
      .insert(payload)
      .select();

    if (error) {
      console.error("Failed to insert snapshot:", error);
      vscode.window.showErrorMessage(`Failed to save snapshot: ${error.message}`);
    } else {
      console.log(`✅ Snapshot successfully inserted for project: ${projectName}`);
      if (data && data.length > 0) {
        console.log(`   Snapshot ID: ${data[0].id}`);
      }
    }
  }

  /**
   * Count total lines changed across all diffs
   * Counts lines starting with + or - (but not +++ or ---)
   */
  private countTotalLines(diffs: Record<string, string>): number {
    let total = 0;

    for (const diff of Object.values(diffs)) {
      // Count lines starting with + or - (actual changes)
      // Exclude lines starting with +++ or --- (file headers)
      const lines = diff.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          total++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          total++;
        }
      }
    }

    return total;
  }

  private getProjectName(): string {
    const w = vscode.workspace.workspaceFolders?.[0];
    return w?.name ?? "untitled-workspace";
  }

  /**
   * Publishes a timeline snapshot:
   * Creates a new snapshot marking a milestone/publish event
   */
  public async publishSnapshot(userId: string, projectName: string, teamId?: string) {
    // Require teamId for snapshot
    if (!teamId) {
      console.warn('[SnapshotManager] No team selected - skipping publish');
      vscode.window.showWarningMessage('Please select a team before publishing snapshots');
      return;
    }

    vscode.window.showInformationMessage('📤 Publishing snapshot to timeline...');

    const newSnapshot = await this.captureWholeWorkspace();
    const diff = this.computeUnifiedDiffs(this.baselineSnapshot || {}, newSnapshot);

    // Create a new snapshot row with ONLY changes (not full workspace)
    await this.insertNewSnapshot(userId, projectName, teamId, {}, diff);

    vscode.window.showInformationMessage('✅ Snapshot published successfully');

    // Update baseline to current state
    this.baselineSnapshot = newSnapshot;
  }


  /**
   * Manual user-triggered snapshot
   * Creates a new snapshot immediately regardless of thresholds
   */
  public async userTriggeredSnapshot(userId: string, projectName: string, teamId?: string) {
    // Require teamId for snapshot
    if (!teamId) {
      console.warn('[SnapshotManager] No team selected - skipping manual snapshot');
      vscode.window.showWarningMessage('Please select a team before taking snapshots');
      return;
    }

    vscode.window.showInformationMessage('📸 Capturing manual snapshot...');

    const newSnapshot = await this.captureWholeWorkspace();
    const diff = this.computeUnifiedDiffs(this.baselineSnapshot || {}, newSnapshot);

    const filesChanged = Object.keys(diff).length;
    const linesChanged = this.countTotalLines(diff);

    // Create new snapshot row with ONLY changes (not full workspace)
    await this.insertNewSnapshot(userId, projectName, teamId, {}, diff);

    vscode.window.showInformationMessage(
      `✅ Manual snapshot complete: ${filesChanged} files, ${linesChanged} lines`
    );

    // Update baseline to current state
    this.baselineSnapshot = newSnapshot;
  }

  private async requireUser(): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn("User not signed in — skipping snapshot");
    }
    return userId ?? "";
  }

  // ——————————————————————
  // Live Share Integration Methods
  // ——————————————————————

  /**
   * Saves any pending local changes and pauses automatic snapshot tracking.
   * Called when user joins or starts a Live Share session.
   */
  public async pauseAutomaticTracking(userId: string, teamId?: string) {
    console.log('[SnapshotManager] Pausing automatic tracking for Live Share session');

    if (!teamId) {
      console.warn('[SnapshotManager] No team selected - skipping final snapshot');
    } else {
      // Save any pending local changes before pausing
      await this.takeIncrementalSnapshot(userId, teamId);
    }

    // Pause automatic tracking
    this.isAutomaticTrackingPaused = true;

    // Clear any pending idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    console.log('[SnapshotManager] Automatic tracking paused');
  }

  /**
   * Creates a session baseline snapshot for the host.
   * This snapshot will be used to calculate the diff when the session ends.
   * Called only when user is the host (starts a session).
   */
  public async createSessionBaseline() {
    console.log('[SnapshotManager] Creating session baseline snapshot');

    // Capture current workspace state as session baseline
    this.sessionBaselineSnapshot = await this.captureWholeWorkspace();

    const fileCount = Object.keys(this.sessionBaselineSnapshot).length;
    console.log(`[SnapshotManager] Session baseline created: ${fileCount} files`);
  }

  /**
   * Resumes automatic snapshot tracking after a Live Share session ends.
   * Takes a new initial snapshot to set a fresh baseline for local changes.
   * Called when session ends (both host and guest).
   */
  public async resumeAutomaticTracking(userId: string, projectName: string, teamId?: string) {
    console.log('[SnapshotManager] Resuming automatic tracking after Live Share session');

    if (!teamId) {
      console.warn('[SnapshotManager] No team selected - skipping snapshot');
    } else {
      // Take a new initial snapshot to set a fresh baseline for local changes
      vscode.window.showInformationMessage('📸 Taking snapshot after session...');
      await this.takeSnapshot(userId, projectName, teamId);
    }

    // Resume automatic tracking
    this.isAutomaticTrackingPaused = false;

    console.log('[SnapshotManager] Automatic tracking resumed');
  }

  /**
   * Calculates and saves the session diff (host only).
   * Compares current state against the session baseline created at session start.
   * Returns the changes as a unified diff string.
   * Called only when the host ends the session.
   */
  public async captureSessionChanges(userId: string, teamId: string): Promise<string> {
    console.log('[SnapshotManager] Capturing session changes');

    if (!this.sessionBaselineSnapshot) {
      console.warn('[SnapshotManager] No session baseline found - cannot calculate session changes');
      return '';
    }

    // Capture current workspace state
    const currentSnapshot = await this.captureWholeWorkspace();

    // Calculate diff against session baseline
    const sessionDiff = this.computeUnifiedDiffs(this.sessionBaselineSnapshot, currentSnapshot);

    // Convert diff map to a single string
    let diffString = '';
    for (const [filePath, diff] of Object.entries(sessionDiff)) {
      diffString += `\n=== ${filePath} ===\n${diff}\n`;
    }

    const filesChanged = Object.keys(sessionDiff).length;
    const linesChanged = this.countTotalLines(sessionDiff);

    console.log(`[SnapshotManager] Session changes: ${filesChanged} files, ${linesChanged} lines`);

    // Clear the session baseline
    this.sessionBaselineSnapshot = null;

    return diffString;
  }
}