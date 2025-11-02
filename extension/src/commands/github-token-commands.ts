import * as vscode from 'vscode';
import { storeGitHubAccessToken, clearGitHubAccessToken } from '../services/github-verification-service';

/**
 * Command to set GitHub Personal Access Token for repository verification
 */
export const setGitHubTokenCommand = vscode.commands.registerCommand(
    'collabAgent.setGitHubToken',
    async () => {
        const token = await vscode.window.showInputBox({
            prompt: 'Enter your GitHub Personal Access Token',
            placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Token cannot be empty';
                }
                if (!value.startsWith('ghp_') && !value.startsWith('github_pat_')) {
                    return 'Invalid token format. Should start with "ghp_" or "github_pat_"';
                }
                return null;
            }
        });

        if (!token) {
            return;
        }

        // Test the token by making a simple API call
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CollabAgent-VSCode'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    vscode.window.showErrorMessage('Invalid GitHub token. Please check your token and try again.');
                    return;
                }
                throw new Error(`GitHub API returned ${response.status}`);
            }

            const userData = await response.json();

            // Store the token
            await storeGitHubAccessToken(token);

            vscode.window.showInformationMessage(
                `✓ GitHub token verified and saved! Authenticated as: ${userData.login}`
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(
                `Failed to verify GitHub token: ${error.message}`
            );
        }
    }
);

/**
 * Command to clear stored GitHub token
 */
export const clearGitHubTokenCommand = vscode.commands.registerCommand(
    'collabAgent.clearGitHubToken',
    async () => {
        const confirm = await vscode.window.showWarningMessage(
            'Are you sure you want to clear your GitHub token?',
            'Yes',
            'Cancel'
        );

        if (confirm === 'Yes') {
            await clearGitHubAccessToken();
            vscode.window.showInformationMessage('GitHub token cleared successfully');
        }
    }
);

/**
 * Command to check GitHub token status
 */
export const checkGitHubTokenCommand = vscode.commands.registerCommand(
    'collabAgent.checkGitHubToken',
    async () => {
        const { globalContext } = require('../extension');
        const token = globalContext?.globalState.get('github_access_token') as string | undefined;

        if (!token) {
            const action = await vscode.window.showWarningMessage(
                'No GitHub token found. Repository verification is disabled.',
                'Set Token',
                'Learn More'
            );

            if (action === 'Set Token') {
                vscode.commands.executeCommand('collabAgent.setGitHubToken');
            } else if (action === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/settings/tokens'));
            }
            return;
        }

        // Test the token
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'CollabAgent-VSCode'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    vscode.window.showErrorMessage(
                        'GitHub token is invalid or expired. Please set a new token.',
                        'Set New Token'
                    ).then(action => {
                        if (action === 'Set New Token') {
                            vscode.commands.executeCommand('collabAgent.setGitHubToken');
                        }
                    });
                    return;
                }
            }

            const userData = await response.json();
            vscode.window.showInformationMessage(
                `✓ GitHub token is valid! Authenticated as: ${userData.login}`
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(
                `Failed to verify GitHub token: ${error.message}`
            );
        }
    }
);
