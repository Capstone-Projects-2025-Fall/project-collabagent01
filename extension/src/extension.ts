import * as vscode from "vscode";
import * as vsls from 'vsls';
import { signInCommand, signOutCommand, createAuthStatusBarItem } from "./commands/auth-commands";
import { checkUserSignIn } from "./services/auth-service";
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

/** Global extension context for state management and subscriptions */
export let globalContext: vscode.ExtensionContext;

/**
 * Activates the extension and sets up all features.
 * 
 * @param context - The extension context
 */
export async function activate(context: vscode.ExtensionContext) {
  globalContext = context;

  console.log("Collab Agent Activated");
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

  // Set up Live Share file creation synchronization
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

  context.subscriptions.push(
    authStatusBar,
    signInCommand,
    signOutCommand,
    vscode.commands.registerCommand('collabAgent.setDisplayName', async () => {
      await setDisplayNameExplicit();
    }),
    // Team project management commands
    validateCurrentProjectCommand,
    showCurrentProjectInfoCommand,
    updateTeamProjectCommand,
    checkTeamProjectCompatibilityCommand,
    openTeamProjectCommand
  );

  // Initialize display name for participant updates
  getOrInitDisplayName(true).catch(err => console.warn('Display name init failed', err));

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
}
/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Collab Agent Deactivated");
}
