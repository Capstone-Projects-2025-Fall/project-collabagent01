import * as vscode from 'vscode';

export interface LiveShareStatus {
  isInstalled: boolean;
  isEnabled: boolean;
  isActive: boolean;
  version?: string;
}

const LIVE_SHARE_EXTENSION_ID = 'ms-vsliveshare.vsliveshare';

export async function checkLiveShareStatus(): Promise<LiveShareStatus> {
  try {
    const extension = vscode.extensions.getExtension(LIVE_SHARE_EXTENSION_ID);
    
    if (!extension) {
      return {
        isInstalled: false,
        isEnabled: false,
        isActive: false
      };
    }

    const isEnabled = extension.isActive !== undefined;
    const isActive = extension.isActive;

    return {
      isInstalled: true,
      isEnabled,
      isActive,
      version: extension.packageJSON?.version
    };
  } catch (error) {
    console.warn('Error checking Live Share status:', error);
    return {
      isInstalled: false,
      isEnabled: false,
      isActive: false
    };
  }
}

export function isLiveShareInstalled(): boolean {
  try {
    const extension = vscode.extensions.getExtension(LIVE_SHARE_EXTENSION_ID);
    return extension !== undefined;
  } catch (error) {
    console.warn('Error checking if Live Share is installed:', error);
    return false;
  }
}

export function isLiveShareActive(): boolean {
  try {
    const extension = vscode.extensions.getExtension(LIVE_SHARE_EXTENSION_ID);
    return extension?.isActive === true;
  } catch (error) {
    console.warn('Error checking if Live Share is active:', error);
    return false;
  }
}

export async function tryActivateLiveShare(): Promise<boolean> {
  try {
    const extension = vscode.extensions.getExtension(LIVE_SHARE_EXTENSION_ID);
    
    if (!extension) {
      return false;
    }

    if (extension.isActive) {
      return true;
    }

    await extension.activate();
    return extension.isActive;
  } catch (error) {
    console.warn('Error activating Live Share:', error);
    return false;
  }
}

export function getLiveShareExtension(): vscode.Extension<any> | undefined {
  try {
    return vscode.extensions.getExtension(LIVE_SHARE_EXTENSION_ID);
  } catch (error) {
    console.warn('Error getting Live Share extension:', error);
    return undefined;
  }
}

export interface LiveShareNotificationConfig {
  showInstallRecommendation: boolean;
  showFeatureReminders: boolean;
  suppressNotifications: boolean;
}

export async function showInstallRecommendation(): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    'CollabAgent works best with VS Code Live Share extension installed. Without it, some features may be limited.',
    'Install Live Share',
    'Learn More',
    'Don\'t Show Again'
  );

  switch (action) {
    case 'Install Live Share':
      await vscode.commands.executeCommand('workbench.extensions.installExtension', LIVE_SHARE_EXTENSION_ID);
      break;
    case 'Don\'t Show Again':
      await vscode.workspace.getConfiguration('collabAgent').update('liveshare.showInstallRecommendation', false, vscode.ConfigurationTarget.Global);
      break;
  }
}

export async function showFeatureRequiresLiveShare(featureName: string): Promise<void> {
  const action = await vscode.window.showWarningMessage(
    `${featureName} requires VS Code Live Share to function. Would you like to install it?`,
    'Install Live Share',
    'Continue Without'
  );

  if (action === 'Install Live Share') {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', LIVE_SHARE_EXTENSION_ID);
  }
}

export function showLiveShareStatus(status: LiveShareStatus): void {
  if (status.isInstalled && status.isActive) {
    console.log(`Live Share is active (version ${status.version})`);
  } else if (status.isInstalled && !status.isActive) {
    console.log('Live Share is installed but not active');
  } else {
    console.log('Live Share is not installed - some features will be unavailable');
  }
}

export function getLiveShareNotificationConfig(): LiveShareNotificationConfig {
  const config = vscode.workspace.getConfiguration('collabAgent.liveshare');
  
  return {
    showInstallRecommendation: config.get('showInstallRecommendation', true),
    showFeatureReminders: config.get('showFeatureReminders', true),
    suppressNotifications: config.get('suppressNotifications', false)
  };
}