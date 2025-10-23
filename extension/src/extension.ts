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

  // Take a full snapshot on extension start
  (async () => {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        await snapshotManager.takeSnapshot(userId);
      }
    } catch (err) {
      console.error('Automatic snapshot failed:', err);
    }
  })();

  // Register manual snapshot command
  context.subscriptions.push(
    vscode.commands.registerCommand('collabAgent.takeSnapshot', async () => {
      const userId = (await getCurrentUserId()) ?? 'temporary-user-id';
      await snapshotManager.takeSnapshot(userId);
      vscode.window.showInformationMessage("Manual snapshot complete!");
    })
  );

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
}

export function deactivate() {
  console.log("Collab Agent Deactivated");
}
