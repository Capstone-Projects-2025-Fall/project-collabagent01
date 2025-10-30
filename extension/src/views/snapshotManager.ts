// snapshotManager.ts
import * as vscode from "vscode";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { diffLines } from "diff";
import { getCurrentUserId } from "../services/auth-service";
import { getSupabase } from "../auth/supabaseClient";


export class SnapshotManager {
  private idleTimers: Map<string, NodeJS.Timeout> = new Map();
  private IDLE_DELAY = 30000; // 30 seconds
  private lastSnapshot: Record<string, string> = {}; // maps file path -> content
  private supabase: SupabaseClient;

  constructor(
    private context: vscode.ExtensionContext,
  ) {
    this.supabase = getSupabase();

    // Listen for all text changes in the workspace
    vscode.workspace.onDidChangeTextDocument(event => this.onDocumentChange(event));
  }

  /** Called whenever a document changes */
  private onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    console.log("Detected file change:", event.document.uri.fsPath);

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

  private computeDiff(oldSnap: Record<string, string>, newSnap: Record<string, string>) {
    const diffs: Record<string, string> = {};

    for (const filePath in newSnap) {
      const oldContent = oldSnap[filePath] || "";
      const newContent = newSnap[filePath];
      const changes = diffLines(oldContent, newContent);

      let formattedDiff = "";
      for (const part of changes) {
        if (part.added) {
          formattedDiff += part.value
            .split("\n")
            .filter(line => line.trim() !== "")
            .map(line => `+ ${line}`)
            .join("\n") + "\n";
        } else if (part.removed) {
          formattedDiff += part.value
            .split("\n")
            .filter(line => line.trim() !== "")
            .map(line => `- ${line}`)
            .join("\n") + "\n";
        }
      }

      if (formattedDiff.trim().length > 0) {
        diffs[filePath] = formattedDiff.trim();
      }
    }

    return diffs;
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

    if (Object.keys(diff).length > 0) {
      for (const filePath in diff) {
        const fileUri = vscode.Uri.file(filePath);
        await this.overwriteSnapshot(userId, fileUri, newSnapshot[filePath], diff[filePath]);
      }

      this.lastSnapshot = newSnapshot; // ✅ reset baseline here
      console.log("Incremental snapshot saved for changed files.");
    }
  }

  /** Database methods */

  public async overwriteSnapshot(
    userId: string,
    fileUri: vscode.Uri,
    content: string,
    changes?: string
  ) {
    // Fetch the current row first
    const { data: existingRows } = await this.supabase
      .from("file_snapshots")
      .select("changes")
      .eq("user_id", userId)
      .eq("file_path", fileUri.fsPath)
      .single();

    const mergedChanges = existingRows?.changes
      ? existingRows.changes + (changes ?? "")
      : (changes ?? "");

    const { error } = await this.supabase
      .from("file_snapshots")
      .upsert(
        {
          user_id: userId,
          file_path: fileUri.fsPath,
          snapshot: content,
          changes: mergedChanges,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,file_path" }
      );

    if (error) {
      console.error("Failed to upsert snapshot:", error);
    } else {
      console.log(`Snapshot saved for ${fileUri.fsPath}`);
    }
  }

  public async userTriggeredSnapshot(userId: string) {
    const newSnapshot = await this.captureRepoSnapshot();
    const diff = this.computeDiff(this.lastSnapshot, newSnapshot);

    // Merge all file changes into a single summary string
    const aggregatedChanges = Object.values(diff).join("\n");

    for (const filePath in newSnapshot) {
      const fileUri = vscode.Uri.file(filePath);
      const { error } = await this.supabase
        .from("file_snapshots")
        .update({
          snapshot: newSnapshot[filePath],
          timeline_post: aggregatedChanges,
          changes: "", // clear incremental changes
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("file_path", fileUri.fsPath);

      if (error) {
        console.error("Failed to update timeline_post:", error);
      }
    }

    this.lastSnapshot = newSnapshot;
    console.log("User-triggered snapshot and timeline_post saved.");
  }

  public async publishSnapshot(userId: string) {
    const newSnapshot = await this.captureRepoSnapshot();
    const diff = this.computeDiff(this.lastSnapshot, newSnapshot);

    const combinedChanges = Object.values(diff).join("\n");

    // Move current changes → timeline_post, reset changes, update snapshot
    const { error } = await this.supabase
      .from('file_snapshots')
      .update({
        timeline_post: combinedChanges,
        changes: '',
        snapshot: JSON.stringify(newSnapshot),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) console.error('Failed to publish snapshot:', error);
    else console.log('Snapshot successfully published to timeline_post.');

    this.lastSnapshot = newSnapshot;
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