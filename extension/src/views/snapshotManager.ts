// snapshotManager.ts
import * as vscode from "vscode";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { diffLines } from "diff";
import { getCurrentUserId } from "../services/auth-service";

export class SnapshotManager {
  private supabase: SupabaseClient;
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();
  private IDLE_DELAY = 10000; // 10 seconds
  private lastSnapshot: Record<string, string> = {}; // maps file path -> content

  constructor(
    private context: vscode.ExtensionContext,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Listen for all text changes in the workspace
    vscode.workspace.onDidChangeTextDocument(event => this.onDocumentChange(event));
  }

  /** Called whenever a document changes */
  private onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    const fileKey = event.document.uri.toString();

    // Clear existing timer
    if (this.idleTimers.has(fileKey)) clearTimeout(this.idleTimers.get(fileKey)!);

    // Set new idle timer
    this.idleTimers.set(
      fileKey,
      setTimeout(async () => {
        const userId = await this.requireUser();
        if (userId) {
          await this.takeIncrementalSnapshot(userId);
        }
      }, this.IDLE_DELAY)
    );
  }

  /** Capture the full workspace state */
  private async captureRepoSnapshot(): Promise<Record<string, string>> {
    const files = vscode.workspace.textDocuments;
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      snapshot[file.uri.fsPath] = file.getText();
    }
    return snapshot;
  }

  /** Compute diffs between old and new snapshots */
  private computeDiff(oldSnap: Record<string, string>, newSnap: Record<string, string>) {
    const diffs: Record<string, string> = {};

    for (const filePath in newSnap) {
      const oldContent = oldSnap[filePath] || "";
      const newContent = newSnap[filePath];
      const diff = diffLines(oldContent, newContent)
        .filter(part => part.added || part.removed)
        .map(part => part.value)
        .join("");

      if (diff) diffs[filePath] = diff;
    }

    return diffs;
  }

  /** Save incremental changes in DB */
  private async saveSnapshotDiff(userId: string, diff: Record<string, string>) {
    for (const filePath in diff) {
      const changes = diff[filePath];
      await this.supabase.from("snapshot_changes").insert({
        user_id: userId,
        file_path: filePath,
        changes,
        created_at: new Date().toISOString()
      });
    }
  }

  /** Take a full snapshot (first time or manual trigger) */
  public async takeSnapshot(userId: string) {
    const files = vscode.workspace.textDocuments;
    for (const file of files) {
      const content = file.getText();
      await this.overwriteSnapshot(userId, file.uri, content);
    }

    // Initialize lastSnapshot
    this.lastSnapshot = await this.captureRepoSnapshot();

    console.log("Full snapshot taken for all open files.");
  }

  /** Take incremental snapshot based on lastSnapshot */
  public async takeIncrementalSnapshot(userId: string) {
    const newSnapshot = await this.captureRepoSnapshot();
    const diff = this.computeDiff(this.lastSnapshot, newSnapshot);

    if (diff && Object.keys(diff).length > 0) {
      await this.saveSnapshotDiff(userId, diff);

      // Overwrite the previous snapshot with the new state
      for (const filePath in newSnapshot) {
        const fileUri = vscode.Uri.file(filePath);
        await this.overwriteSnapshot(userId, fileUri, newSnapshot[filePath]);
      }

      this.lastSnapshot = newSnapshot;

      console.log("Incremental snapshot saved for changed files.");
    }
  }

  /** Database methods */

  public async overwriteSnapshot(userId: string, fileUri: vscode.Uri, content: string) {
    const { error } = await this.supabase
      .from("snapshots")
      .upsert(
        {
          user_id: userId,
          file_path: fileUri.fsPath,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,file_path" }
      );

    if (error) {
      console.error("Failed to upsert snapshot:", error);
    }
  }

  private async requireUser(): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn("User is not signed in — skipping snapshot");
      return "";
    }
    return userId;
  }
}