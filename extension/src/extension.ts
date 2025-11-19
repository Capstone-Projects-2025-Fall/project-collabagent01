import * as vscode from "vscode";
import * as vsls from 'vsls';
import { signInCommand, signOutCommand, createAuthStatusBarItem } from "./commands/auth-commands";
import { checkUserSignIn, getCurrentUserId } from "./services/auth-service";
import { setGitHubTokenCommand, clearGitHubTokenCommand, checkGitHubTokenCommand } from "./commands/github-token-commands";
import { CollabAgentPanelProvider } from "./views/MainPanel";
import { setDisplayNameExplicit, getOrInitDisplayName } from './services/profile-service';
import {
  validateCurrentProjectCommand,
  showCurrentProjectInfoCommand,
  updateTeamProjectCommand,
  checkTeamProjectCompatibilityCommand,
  openTeamProjectCommand
} from './commands/team-project-commands';
import { connectToJiraCommand, createJiraStatusBarItem } from './commands/jira-commands';
import { getCurrentProjectInfo } from './services/project-detection-service';
import { SnapshotManager } from './views/snapshotManager';
import * as path from "path";
import * as dotenv from "dotenv";
import { getSupabase } from "./auth/supabaseClient";
import { stopConcurrentActivityMonitoring } from './services/concurrent-activity-service';



/** Global extension context for state management */
export let globalContext: vscode.ExtensionContext;

/** Global snapshot manager instance - exported so AgentPanel can trigger initial snapshot */
export let snapshotManager: SnapshotManager;

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
  snapshotManager = new SnapshotManager(context);
  console.log("SnapshotManager initialized");

  vscode.window.showInformationMessage("Collab Agent: Extension activated!");

  await vscode.commands.executeCommand('setContext', 'collabAgent.showPanel', true);
  checkUserSignIn();

  const authStatusBar = createAuthStatusBarItem(context);
  const collabPanelProvider = new CollabAgentPanelProvider(context.extensionUri, context);
  const teamView = vscode.window.registerWebviewViewProvider('collabAgent.teamActivity', collabPanelProvider);
  const projectName = vscode.workspace.workspaceFolders?.[0]?.name ?? "untitled-workspace";
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

  // Create Jira status bar item
  const jiraStatusBar = createJiraStatusBarItem(context);

  context.subscriptions.push(
    authStatusBar,
    jiraStatusBar,
    signInCommand,
    signOutCommand,
    vscode.commands.registerCommand('collabAgent.connectToJira', () => connectToJiraCommand(globalContext)),
    vscode.commands.registerCommand('collabAgent.setDisplayName', async () => {
      await setDisplayNameExplicit();
    }),
    // GitHub token management
    setGitHubTokenCommand,
    clearGitHubTokenCommand,
    checkGitHubTokenCommand,
    // Team project management commands
    validateCurrentProjectCommand,
    showCurrentProjectInfoCommand,
    updateTeamProjectCommand,
    checkTeamProjectCompatibilityCommand,
    openTeamProjectCommand
  );

  getOrInitDisplayName(true).catch(err => console.warn('Display name init failed', err));

  // Register URI handler for GitHub OAuth callback (optional - only if not already registered)
  try {
    const uriHandler = vscode.window.registerUriHandler({
      handleUri: async (uri: vscode.Uri) => {
        console.log('[OAuth Callback] Received URI:', uri.toString());

        // Handle GitHub OAuth callback
        if (uri.path === '/auth/callback') {
          try {
            // Extract the session from the URI (Supabase will handle this)
            const { getSupabase } = require('./auth/supabaseClient');
            const supabase = getSupabase();

            // Get the session which should now include the provider_token
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
              console.error('[OAuth Callback] Error getting session:', error);
              vscode.window.showErrorMessage('GitHub sign-in failed. Please try again.');
              return;
            }

            if (session?.provider_token) {
              // Store the GitHub token for future use
              const { storeGitHubAccessToken } = require('./services/github-verification-service');
              await storeGitHubAccessToken(session.provider_token);
              console.log('[OAuth Callback] GitHub token stored successfully');

              vscode.window.showInformationMessage('Successfully signed in with GitHub!');
            } else {
              console.warn('[OAuth Callback] No provider_token found in session');
            }
          } catch (err) {
            console.error('[OAuth Callback] Error handling callback:', err);
          }
        }
      }
    });
    context.subscriptions.push(uriHandler);
  } catch (error) {
    // URI handler already registered - that's fine, just log it
    console.log('[Extension] URI handler already registered (extension reload), skipping registration');
  }

  // Show current project info in console for debugging
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

    // NOTE: Initial snapshot is now taken when team is selected (not on extension load)
    // This ensures user has proper team context before capturing workspace state

  // Register manual snapshot command (available via Command Palette)
  context.subscriptions.push(
    vscode.commands.registerCommand("collabAgent.userSnapshot", async () => {
      const userId = (await getCurrentUserId()) ?? "";
      if (!userId) {
        vscode.window.showWarningMessage("Please sign in before taking a snapshot.");
        return;
      }

      const projectName = vscode.workspace.workspaceFolders?.[0]?.name ?? "untitled-workspace";
      await snapshotManager.userTriggeredSnapshot(userId, projectName);
      vscode.window.showInformationMessage("Manual snapshot saved for project!");
      console.log(`Manual snapshot and timeline post recorded for project: ${projectName}`);
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

        const projectName = vscode.workspace.workspaceFolders?.[0]?.name ?? "untitled-workspace";
        await snapshotManager.publishSnapshot(userId, projectName);

        vscode.window.showInformationMessage("Snapshot published successfully!");
        console.log(`[Publish] Snapshot published for project: ${projectName}`);
      } catch (err) {
        console.error("[Publish] Failed to publish snapshot:", err);
        vscode.window.showErrorMessage("Failed to publish snapshot. Check console for details.");
      }
    })
  );

  // Debug command to manually trigger concurrent activity check
  context.subscriptions.push(
    vscode.commands.registerCommand("collabAgent.checkConcurrentActivity", async () => {
      try {
        const teamId = context.globalState.get<string>('collabAgent.currentTeam');
        if (!teamId) {
          vscode.window.showWarningMessage("No team selected. Please select a team first.");
          return;
        }

        vscode.window.showInformationMessage("Checking for concurrent activity..5.");
        const { getConcurrentActivityDetector } = require('./services/concurrent-activity-service');
        const detector = getConcurrentActivityDetector();
        await detector.triggerCheck(teamId);
        vscode.window.showInformationMessage("Concurrent activity check complete. See console for details.");
      } catch (err) {
        console.error("[Debug] Failed to check concurrent activity:", err);
        vscode.window.showErrorMessage("Failed to check concurrent activity. Check console for details.");
      }
    })
  );
}

export function deactivate() {
  console.log("Collab Agent Deactivated");
  // Stop concurrent activity monitoring on extension deactivation
  stopConcurrentActivityMonitoring();
}
