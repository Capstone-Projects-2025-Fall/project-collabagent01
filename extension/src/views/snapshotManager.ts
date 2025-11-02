// snapshotManager.ts
import * as vscode from "vscode";
import { SupabaseClient } from "@supabase/supabase-js";
import { createTwoFilesPatch } from "diff"; // ensure `diff` is installed
import { getCurrentUserId } from "../services/auth-service";
import { getSupabase } from "../auth/supabaseClient";

type FileMap = Record<string, string>;

export class SnapshotManager {
  private supabase: SupabaseClient;
  private idleTimer: NodeJS.Timeout | null = null;
  private IDLE_DELAY = 30_000; // 30s idle window per your requirement

  /** The original/baseline snapshot of the whole workspace (first full capture) */
  private baselineSnapshot: FileMap | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.supabase = getSupabase();
    vscode.workspace.onDidChangeTextDocument(() => this.onWorkspaceActivity());
    vscode.workspace.onDidCreateFiles(() => this.onWorkspaceActivity());
    vscode.workspace.onDidDeleteFiles(() => this.onWorkspaceActivity());
    vscode.workspace.onDidRenameFiles(() => this.onWorkspaceActivity());
  }

  // ——————————————————————
  // Public APIs you already call
  // ——————————————————————

  /** Initial full snapshot (called on activate and from the “Publish” flow after committing a timeline_post) */
  public async takeSnapshot(userId: string, projectName: string) {
    const snapshot = await this.captureWholeWorkspace();

    // Save baseline in memory
    this.baselineSnapshot = snapshot;

    // Write to DB: snapshot (all files), clear changes
    await this.upsertUnifiedRow(userId, projectName, snapshot, {});
    console.log("Full workspace snapshot saved.");
  }

  /** Idle-based incremental snapshot: recompute ALL changes vs baseline and store them merged in one row */
  public async takeIncrementalSnapshot(userId: string) {
    // We require a baseline snapshot to compare against.
    if (!this.baselineSnapshot) {
      // No baseline yet? Create one now (e.g., first run after opening project).
      const projectName = this.getProjectName();
      await this.takeSnapshot(userId, projectName);
      return;
    }

    const projectName = this.getProjectName();
    const current = await this.captureWholeWorkspace();

    // Build merged diffs vs the ORIGINAL baseline, per file
    const mergedChanges = this.computeUnifiedDiffs(this.baselineSnapshot, current);

    // Replace DB `changes` with this merged object (no history — just current delta)
    await this.upsertUnifiedRow(userId, projectName, /*snapshot*/ undefined, mergedChanges);
    console.log("Incremental (merged) changes saved.");
  }

  // ——————————————————————
  // Idle handling
  // ——————————————————————
  private onWorkspaceActivity() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(async () => {
      const userId = await this.requireUser();
      if (userId) await this.takeIncrementalSnapshot(userId);
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
        files[uri.fsPath] = doc.getText();
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

  /** Single-row upsert per (user_id, project_name). Optionally update snapshot and/or changes. */
  private async upsertUnifiedRow(
    userId: string,
    projectName: string,
    snapshot?: FileMap,
    changes?: Record<string, string>
  ) {
    // Always send a valid snapshot and changes object to satisfy NOT NULL constraints
    const safeSnapshot =
      snapshot ?? this.baselineSnapshot ?? {}; // fallback to baseline or empty object
    const safeChanges = changes ?? {};

    const payload = {
      user_id: userId,
      project_name: projectName,
      snapshot: safeSnapshot,
      changes: safeChanges,
      updated_at: new Date().toISOString(),
    };

    console.log("[DB UPSERT] payload:", JSON.stringify(payload, null, 2));

    const { error } = await this.supabase
      .from("file_snapshots")
      .upsert(payload, { onConflict: "user_id,project_name" });

    if (error) {
      console.error("Failed to upsert unified snapshot:", error);
    } else {
      console.log(`Snapshot successfully upserted for project: ${projectName}`);
    }
  }

  private getProjectName(): string {
    const w = vscode.workspace.workspaceFolders?.[0];
    return w?.name ?? "untitled-workspace";
  }

  /** 
   * Publishes a timeline snapshot:
   * Moves all current diffs (`changes`) into `timeline_post`,
   * replaces the `snapshot` with the current repo snapshot,
   * and clears `changes`.
   */
  public async publishSnapshot(userId: string, projectName: string) {
    const newSnapshot = await this.captureWholeWorkspace();
    const diff = this.computeUnifiedDiffs(this.baselineSnapshot || {}, newSnapshot);

    // Fetch existing record so we can move `changes` -> `timeline_post`
    const { data: existing, error: fetchErr } = await this.supabase
      .from("file_snapshots")
      .select("changes")
      .eq("user_id", userId)
      .eq("project_name", projectName)
      .maybeSingle();

    if (fetchErr) {
      console.error("Failed to fetch existing snapshot before publish:", fetchErr);
      return;
    }

    const previousChanges = existing?.changes || {};

    const { error } = await this.supabase
      .from("file_snapshots")
      .update({
        snapshot: newSnapshot,
        timeline_post: previousChanges,
        changes: {},
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("project_name", projectName);

    if (error) {
      console.error("Failed to publish snapshot:", error);
    } else {
      console.log(`✅ Published snapshot for project: ${projectName}`);
    }

    this.baselineSnapshot = newSnapshot;
  }


  /**
   * Manual user-triggered snapshot that merges new diffs into `changes`
   * without publishing yet.
   */
  public async userTriggeredSnapshot(userId: string, projectName: string) {
    const newSnapshot = await this.captureWholeWorkspace();
    const diff = this.computeUnifiedDiffs(this.baselineSnapshot || {}, newSnapshot);

    // Fetch existing changes to merge with new ones
    const { data: existing, error: fetchErr } = await this.supabase
      .from("file_snapshots")
      .select("changes")
      .eq("user_id", userId)
      .eq("project_name", projectName)
      .maybeSingle();

    if (fetchErr) {
      console.error("Failed to fetch existing snapshot before update:", fetchErr);
      return;
    }

    const mergedChanges = { ...(existing?.changes || {}), ...diff };

    const { error } = await this.supabase
      .from("file_snapshots")
      .update({
        snapshot: newSnapshot,
        changes: mergedChanges,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("project_name", projectName);

    if (error) {
      console.error("Failed to save user-triggered snapshot:", error);
    } else {
      console.log(`💾 Manual snapshot saved for project: ${projectName}`);
    }

    this.baselineSnapshot = newSnapshot;
  }

  private async requireUser(): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn("User not signed in — skipping snapshot");
    }
    return userId ?? "";
  }
}