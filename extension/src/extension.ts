import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables (optional - don't fail if .env doesn't exist)
try {
  dotenv.config({ path: path.join(__dirname, '../../server/.env') });
} catch (error) {
  console.warn('Could not load .env file:', error);
}
import * as vscode from "vscode";
import * as vsls from 'vsls';
import { signInCommand, signOutCommand, createAuthStatusBarItem } from "./commands/auth-commands";
import { checkUserSignIn } from "./services/auth-service";
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

  // Initialize display name for participant updates
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
}
/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Collab Agent Deactivated");
}
