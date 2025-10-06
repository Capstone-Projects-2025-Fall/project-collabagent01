import * as vscode from "vscode";
import * as vsls from 'vsls';
import { signInCommand, signOutCommand, createAuthStatusBarItem } from "./commands/auth-commands";
import { checkUserSignIn } from "./services/auth-service";
import { CollabAgentPanelProvider } from "./views/CollabAgentPanel";
import { setDisplayNameExplicit, getOrInitDisplayName } from './services/profile-service';
import { 
  checkLiveShareStatus, 
  showInstallRecommendation, 
  showLiveShareStatus, 
  getLiveShareNotificationConfig,
  isLiveShareInstalled,
  isLiveShareActive 
} from './services/liveshare-checker-service';

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

  await checkAndNotifyLiveShareStatus();

  checkUserSignIn();

  const authStatusBar = createAuthStatusBarItem(context);

  const collabPanelProvider = new CollabAgentPanelProvider(context.extensionUri, context);
  const disposable = vscode.window.registerWebviewViewProvider(
    'collabAgent.teamActivity',
    collabPanelProvider
  );
  context.subscriptions.push(disposable);
  
  const refreshCommand = vscode.commands.registerCommand('collabAgent.refreshPanel', () => {
    vscode.commands.executeCommand('workbench.view.extension.collabAgent');
  });
  context.subscriptions.push(refreshCommand);

  // Set up Live Share integration only if available
  await setupLiveShareIntegration();

  globalContext.subscriptions.push(
    authStatusBar,
    signInCommand,
    signOutCommand,
    vscode.commands.registerCommand('collabAgent.setDisplayName', async () => {
      await setDisplayNameExplicit();
    }),
    vscode.commands.registerCommand('collabAgent.checkLiveShareStatus', async () => {
      await checkAndShowLiveShareStatus();
    })
  );

  getOrInitDisplayName(true).catch(err => console.warn('Display name init failed', err));
}

async function checkAndNotifyLiveShareStatus(): Promise<void> {
  try {
    const status = await checkLiveShareStatus();
    const config = getLiveShareNotificationConfig();
    
    showLiveShareStatus(status);
    
    if (!status.isInstalled && config.showInstallRecommendation && !config.suppressNotifications) {
      await showInstallRecommendation();
    }
  } catch (error) {
    console.warn('Error checking Live Share status:', error);
  }
}

async function checkAndShowLiveShareStatus(): Promise<void> {
  try {
    const status = await checkLiveShareStatus();
    
    let message: string;
    let messageType: 'info' | 'warning' = 'info';
    
    if (status.isInstalled && status.isActive) {
      message = `Live Share is installed and active. All collaboration features are available.`;
    } else if (status.isInstalled && !status.isActive) {
      message = 'Live Share is installed but not active. Some collaboration features may be limited.';
      messageType = 'warning';
    } else {
      message = 'Live Share is not installed. Some collaboration features will be unavailable. Would you like to install it?';
      messageType = 'warning';
      
      const action = await vscode.window.showWarningMessage(
        message,
        'Install Live Share',
        'Learn More'
      );
      
      if (action === 'Install Live Share') {
        await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-vsliveshare.vsliveshare');
      } 
      return;
    }

    switch (messageType) {
      case 'info':
        vscode.window.showInformationMessage(message);
        break;
      case 'warning':
        vscode.window.showWarningMessage(message);
        break;
    }
  } catch (error) {
    console.warn('Error checking Live Share status:', error);
    vscode.window.showErrorMessage('Error checking Live Share status. Check the console for details.');
  }
}

async function setupLiveShareIntegration(): Promise<void> {
  try {
    if (!isLiveShareInstalled()) {
      console.log('Live Share not installed - skipping Live Share integration');
      return;
    }

    if (!isLiveShareActive()) {
      console.log('Live Share not active - skipping Live Share integration');
      return;
    }

    const liveShare = await vsls.getApi();
    if (!liveShare) {
      console.log('Live Share API not available - skipping Live Share integration');
      return;
    }

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

    console.log('Live Share integration setup completed');
  } catch (error) {
    console.warn('Error setting up Live Share integration:', error);
  }
}
/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
  console.log("Collab Agent Deactivated");
}
