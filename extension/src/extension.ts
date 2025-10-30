// Load environment variables (optional - don't fail if .env doesn't exist)
try {
  dotenv.config({ path: path.join(__dirname, '../../server/.env') });
} catch (error) {
  console.warn('Could not load .env file:', error);
}
import * as vscode from "vscode";
import * as vsls from 'vsls';
import { signInCommand, signOutCommand, createAuthStatusBarItem } from "./commands/auth-commands";
import { checkUserSignIn, getCurrentUserId } from "./services/auth-service";
import { CollabAgentPanelProvider } from "./views/MainPanel";
import { setDisplayNameExplicit, getOrInitDisplayName } from './services/profile-service';
import { 
  validateCurrentProjectCommand, 
  showCurrentProjectInfoCommand, 
  updateTeamProjectCommand, 
  checkTeamProjectCompatibilityCommand, 
  openTeamProjectCommand 
} from './commands/team-project-commands';
import { getCurrentProjectInfo } from './services/project-detection-service';
import { SnapshotManager } from './views/snapshotManager';
import * as path from "path";
import * as dotenv from "dotenv";
import { getSupabase } from "./auth/supabaseClient";



/** Global extension context for state management */
export let globalContext: vscode.ExtensionContext;

export async function activate(context: vscode.ExtensionContext) {
  globalContext = context;
  console.log("Collab Agent Activated");


  //Load .env from the /server directory (relative to the compiled dist)
  const envPath = path.resolve(__dirname, "../../server/.env");
  dotenv.config({ path: envPath });
  console.log("Looking for .env at:", envPath);

  console.log("SUPABASE_URL:", process.env.SUPABASE_URL || "Missing");
  console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_KEY ? "Loaded" : "Missing");

  //Initialize shared Supabase client
  try {
    const supabase = getSupabase();
    console.log("Supabase client initialized successfully:", supabase !== null);

    // Step 2: Force session refresh before anything else
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.warn("[Auth] Session refresh error:", sessionError.message);
    } else {
      console.log("[Auth] Session check complete before initializing snapshot:", !!sessionData?.session);
    }

  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }

  // Initialize the snapshot manager (uses the shared client)
  const snapshotManager = new SnapshotManager(context);
  console.log("SnapshotManager initialized");

  vscode.window.showInformationMessage("Collab Agent: Extension activated!");

  await vscode.commands.executeCommand('setContext', 'collabAgent.showPanel', true);
  checkUserSignIn();

  const authStatusBar = createAuthStatusBarItem(context);
  const collabPanelProvider = new CollabAgentPanelProvider(context.extensionUri, context);
  const teamView = vscode.window.registerWebviewViewProvider('collabAgent.teamActivity', collabPanelProvider);
  context.subscriptions.push(teamView);

  const refreshCommand = vscode.commands.registerCommand('collabAgent.refreshPanel', () => {
    vscode.commands.executeCommand('workbench.view.extension.collabAgent');
  });
  context.subscriptions.push(refreshCommand);

  // Set up Live Share file creation synchronization (optional)
  try {
    const liveShare = await vsls.getApi();
    if (liveShare) {
      const service = await liveShare.getSharedService('collabagent');

      // Notify other participants when files are created
      vscode.workspace.onDidCreateFiles(async (event) => {
        if (service) {
          for (const file of event.files) {
            service.notify('fileCreated', { path: file.path });
          }
        }
      });

      // Handle file creation notifications from other participants
      if (service) {
        service.onNotify('fileCreated', async (args: any) => {
          try {
            if (args && typeof args.path === 'string') {
              const sharedUri = vscode.Uri.parse(args.path);
              let localUri = sharedUri;
              if (liveShare.convertSharedUriToLocal) {
                const converted = await liveShare.convertSharedUriToLocal(sharedUri);
                if (converted) {
                  localUri = converted;
                }
              }
              vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
              vscode.window.showInformationMessage(`New file created in session: ${localUri.fsPath}`);
            } else {
              console.warn('fileCreated notification received without valid path:', args);
            }
          } catch (err) {
            console.error('Error converting shared URI:', err);
          }
        });
      }
    }
  } catch (error) {
    console.warn('Live Share extension not available or failed to initialize:', error);
    // Continue without Live Share features - don't show error popup
  }

  context.subscriptions.push(
    authStatusBar,
    signInCommand,
    signOutCommand,
    vscode.commands.registerCommand('collabAgent.setDisplayName', async () => await setDisplayNameExplicit()),
    validateCurrentProjectCommand,
    showCurrentProjectInfoCommand,
    updateTeamProjectCommand,
    checkTeamProjectCompatibilityCommand,
    openTeamProjectCommand
  );

  getOrInitDisplayName(true).catch(err => console.warn('Display name init failed', err));

  const currentProject = getCurrentProjectInfo();
  if (currentProject) {
    console.log('Collab Agent - Current Project:', {
      name: currentProject.projectName,
      path: currentProject.localPath,
      hash: currentProject.projectHash,
      isGitRepo: currentProject.isGitRepo,
      remoteUrl: currentProject.remoteUrl
    });
  } else {
    console.log('Collab Agent - No workspace folder detected');
  }

    // Take a full snapshot automatically when the extension starts
    (async () => {
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          await snapshotManager.takeSnapshot(userId);
          console.log("Initial snapshot captured for user:", userId);
        } else {
          console.warn("No user ID found — skipping initial snapshot");
        }
      } catch (err) {
        console.error("Automatic snapshot failed:", err);
      }
    })();

  // Register manual snapshot command (available via Command Palette)
  context.subscriptions.push(
    vscode.commands.registerCommand("collabAgent.userSnapshot", async () => {
      const userId = (await getCurrentUserId()) ?? "";
      if (!userId) {
        vscode.window.showWarningMessage("Please sign in before taking a snapshot.");
        return;
      }

      await snapshotManager.userTriggeredSnapshot(userId);
      vscode.window.showInformationMessage("Manual snapshot saved and timeline updated!");
      console.log("Manual snapshot and timeline post recorded for user:", userId);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("collabAgent.publishSnapshot", async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          vscode.window.showWarningMessage("You must be signed in to publish a snapshot.");
          return;
        }

        const snapshotManager = new SnapshotManager(context);
        await snapshotManager.publishSnapshot(userId); // <– call the new method we wrote earlier

        vscode.window.showInformationMessage("Snapshot published successfully!");
        console.log("[Publish] Snapshot published and timeline_post updated.");
      } catch (err) {
        console.error("[Publish] Failed to publish snapshot:", err);
        vscode.window.showErrorMessage("Failed to publish snapshot. Check console for details.");
      }
    })
  );
}

export function deactivate() {
  console.log("Collab Agent Deactivated");
}
