import * as vscode from "vscode";
import * as vsls from 'vsls';
import { signInCommand, signOutCommand, createAuthStatusBarItem } from "./commands/auth-commands";
import { checkUserSignIn } from "./services/auth-service";
import { CollabAgentPanelProvider } from "./views/CollabAgentPanel";
import { setDisplayNameExplicit, getOrInitDisplayName } from './services/profile-service';

/**
 * Global extension context shared across the entire lifecycle of the VS Code extension.
 * This context is used to store global state, manage subscriptions, and access workspace-specific configurations.
 */
export let globalContext: vscode.ExtensionContext;

/**
 * Cleanup handler invoked when the extension is deactivated.
 *
 * This function is called by the VS Code runtime when the extension is deactivated,
 * such as when the user disables the extension or when VS Code is shutting down.
 * It is used to perform any necessary cleanup, such as disposing resources or saving state.
 */
export async function activate(context: vscode.ExtensionContext) {
  globalContext = context;

  // Use both console.log and VS Code notifications for debugging
  console.log("Collab Agent Activated");
  vscode.window.showInformationMessage("Collab Agent: Extension activated!");

  // Set context to show the panel
  await vscode.commands.executeCommand('setContext', 'collabAgent.showPanel', true);

  checkUserSignIn();

  const authStatusBar = createAuthStatusBarItem(context);

  // Register the Collab Agent panel provider
  console.log("Registering CollabAgentPanelProvider...");
  vscode.window.showInformationMessage("Collab Agent: Registering webview provider...");
  
  const collabPanelProvider = new CollabAgentPanelProvider(context.extensionUri, context);
  const disposable = vscode.window.registerWebviewViewProvider(
    'collabAgent.teamActivity',
    collabPanelProvider
  );
  context.subscriptions.push(disposable);
  console.log("CollabAgentPanelProvider registered successfully");
  vscode.window.showInformationMessage("Collab Agent: Webview provider registered!");

  const refreshCommand = vscode.commands.registerCommand('collabAgent.refreshPanel', () => {
    vscode.commands.executeCommand('workbench.view.extension.collabAgent');
  });
  context.subscriptions.push(refreshCommand);

  // Live Share file creation sync
  const liveShare = await vsls.getApi();
  if (liveShare) {
    // Set up shared service for file creation notifications
    const service = await liveShare.getSharedService('collabagent');

    // Listen for file creation events (guests)
    vscode.workspace.onDidCreateFiles(async (event) => {
      if (service) {
        for (const file of event.files) {
          // Notify host and other guests
          service.notify('fileCreated', { path: file.path });
        }
      }
    });

    // Listen for fileCreated notifications (host/guests)
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
    // Supabase-related commands removed
  );

  // Pre-initialize display name silently (nonInteractive) so first participant update has a name if possible.
  getOrInitDisplayName(true).catch(err => console.warn('Display name init failed', err));
}
/**
 * Called when the extension is deactivated.
 * Used for any necessary cleanup (currently logs deactivation to the console).
 */
export function deactivate() {
  console.log("AI Extension Deactivated");
}
