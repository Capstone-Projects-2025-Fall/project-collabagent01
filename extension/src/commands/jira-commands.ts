import * as vscode from 'vscode';
import { JiraService } from '../services/jira-service';

/**
 * Command to initiate Jira integration setup for a team.
 * Accessible via Command Palette and status bar.
 */
export async function connectToJiraCommand(context?: vscode.ExtensionContext): Promise<void> {
    try {
        // Check if user is authenticated
        const { getAuthContext } = require('../services/auth-service');
        const authResult = await getAuthContext();

        if (!authResult?.context?.isAuthenticated) {
            vscode.window.showErrorMessage('Please sign in first to connect to Jira.');
            return;
        }

        // Check if user has teams
        const { getUserTeams } = require('../services/team-service');
        const teamsResult = await getUserTeams();

        if (teamsResult.error || !teamsResult.teams || teamsResult.teams.length === 0) {
            vscode.window.showErrorMessage('Please create or join a team first in the Agent Bot tab.');
            return;
        }

        // Get current team from global state (same as AgentPanel uses)
        const currentTeamId = context?.globalState.get<string>('collabAgent.currentTeam') ||
                             vscode.workspace.getConfiguration('collabAgent').get<string>('currentTeam');
        if (!currentTeamId) {
            vscode.window.showErrorMessage('Please select a team in the Agent Bot tab first.');
            return;
        }

        // Find the current team
        const currentTeam = teamsResult.teams.find((t: any) => t.id === currentTeamId);
        if (!currentTeam) {
            vscode.window.showErrorMessage('Current team not found. Please select a team in the Agent Bot tab.');
            return;
        }

        // Check if user is admin of current team (Admin Workflow requirement)
        if (currentTeam.role !== 'admin') {
            vscode.window.showErrorMessage('Only team admins can configure Jira integration. Please ask your team admin to set up Jira.');
            return;
        }

        // Check if Jira is already configured
        const jiraService = JiraService.getInstance();
        const existingConfig = await jiraService.getJiraConfig(currentTeamId);

        if (existingConfig) {
            const choice = await vscode.window.showQuickPick([
                { label: 'View Current Configuration', description: `Project: ${existingConfig.jira_project_key}` },
                { label: 'Reconfigure Jira', description: 'Set up a different Jira instance/project' },
                { label: 'Remove Jira Integration', description: 'Disconnect Jira from this team' }
            ], {
                placeHolder: 'Jira is already configured for this team'
            });

            if (!choice) return;

            if (choice.label === 'View Current Configuration') {
                vscode.window.showInformationMessage(
                    `Jira Configuration:\n• URL: ${existingConfig.jira_url}\n• Project: ${existingConfig.jira_project_key}\n• Configured by: ${existingConfig.admin_user_id}`
                );
                return;
            }

            if (choice.label === 'Remove Jira Integration') {
                const confirm = await vscode.window.showWarningMessage(
                    'Remove Jira integration from this team? All team members will lose access to Jira tasks.',
                    { modal: true },
                    'Remove'
                );

                if (confirm === 'Remove') {
                    await jiraService.removeJiraConfig(currentTeamId);
                    vscode.window.showInformationMessage('Jira integration removed successfully.');

                    // Refresh the tasks panel
                    vscode.commands.executeCommand('workbench.view.extension.collabAgent');
                }
                return;
            }

            // Fall through to reconfiguration
        }

        // Initiate Jira setup
        await jiraService.initiateJiraAuth(currentTeamId, authResult.context.id);

        // Refresh the tasks panel to show the new configuration
        vscode.commands.executeCommand('workbench.view.extension.collabAgent');

    } catch (error) {
        console.error('Failed to connect to Jira:', error);
        vscode.window.showErrorMessage(
            `Failed to connect to Jira: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Creates a status bar item for Jira integration.
 */
export function createJiraStatusBarItem(context: vscode.ExtensionContext) {
    const item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );

    // initial
    item.text = "Jira: Ready";
    item.show();

    const interval = setInterval(() => {
        item.text = "Jira: Active";
    }, 1000);

    context.subscriptions.push(item);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });

    return item;
}

/**
 * Updates the Jira status bar item based on current team and Jira configuration.
 */
async function updateJiraStatusBarItem(statusBarItem: vscode.StatusBarItem, context: vscode.ExtensionContext): Promise<void> {
    try {
        // Read from global state (same as AgentPanel)
        const currentTeamId = context.globalState.get<string>('collabAgent.currentTeam');

        if (!currentTeamId) {
            statusBarItem.text = '$(issue-opened) Jira';
            statusBarItem.tooltip = 'No team selected - Click to connect Jira';
            return;
        }

        const jiraService = JiraService.getInstance();
        const config = await jiraService.getJiraConfig(currentTeamId);

        if (config) {
            statusBarItem.text = '$(issue-closed) Jira';
            statusBarItem.tooltip = `Jira connected - Project: ${config.jira_project_key}`;
        } else {
            statusBarItem.text = '$(issue-opened) Jira';
            statusBarItem.tooltip = 'Click to connect Jira for this team';
        }
    } catch (error) {
        statusBarItem.text = '$(issue-opened) Jira';
        statusBarItem.tooltip = 'Click to connect Jira';
    }
}
