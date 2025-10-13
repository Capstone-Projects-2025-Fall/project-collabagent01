import * as vscode from 'vscode';
import { 
    validateTeamProject, 
    handleProjectMismatch, 
    openTeamProject, 
    updateTeamProject,
    getTeamProjectDescription 
} from '../services/team-service';
import { getCurrentProjectInfo, getProjectDescription } from '../services/project-detection-service';

/**
 * Command to validate the current project against the selected team
 */
export const validateCurrentProjectCommand = vscode.commands.registerCommand(
    'collabAgent.validateCurrentProject',
    async (teamId?: string) => {
        if (!teamId) {
            vscode.window.showErrorMessage('No team selected for validation');
            return;
        }

        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Validating project...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 50, message: 'Checking team and project info...' });

            const result = await validateTeamProject(teamId);
            
            progress.report({ increment: 100, message: 'Validation complete' });

            if (result.error) {
                vscode.window.showErrorMessage(`Validation failed: ${result.error}`);
                return;
            }

            if (!result.team || !result.currentProject) {
                vscode.window.showErrorMessage('Could not validate project - missing information');
                return;
            }

            if (result.isValid) {
                vscode.window.showInformationMessage(
                    `✅ Project validated!\n\nYou're working on the correct project: ${getProjectDescription(result.currentProject)}`
                );
            } else {
                // Handle project mismatch
                const action = await handleProjectMismatch(result.team, result.currentProject);
                
                switch (action) {
                    case 'switch':
                        await openTeamProject(result.team);
                        break;
                    case 'continue':
                        vscode.window.showWarningMessage(
                            'Continuing with project mismatch. Be careful about what changes you share with your team.'
                        );
                        break;
                    case 'cancel':
                        // Do nothing - user cancelled
                        break;
                }
            }
        });
    }
);

/**
 * Command to show current project information
 */
export const showCurrentProjectInfoCommand = vscode.commands.registerCommand(
    'collabAgent.showCurrentProjectInfo',
    async () => {
        const currentProject = getCurrentProjectInfo();
        
        if (!currentProject) {
            vscode.window.showInformationMessage('No workspace folder is currently open');
            return;
        }

        const projectDesc = getProjectDescription(currentProject);
        const details = [
            `**Project Name:** ${currentProject.projectName}`,
            `**Local Path:** ${currentProject.localPath}`,
            `**Project Hash:** ${currentProject.projectHash}`,
            `**Git Repository:** ${currentProject.isGitRepo ? 'Yes' : 'No'}`
        ];

        if (currentProject.remoteUrl) {
            details.push(`**Remote URL:** ${currentProject.remoteUrl}`);
        }

        await vscode.window.showInformationMessage(
            `📁 **Current Project Information**\n\n${details.join('\n')}`,
            { modal: true }
        );
    }
);

/**
 * Command to update the team's project information (admin only)
 */
export const updateTeamProjectCommand = vscode.commands.registerCommand(
    'collabAgent.updateTeamProject',
    async (teamId?: string) => {
        if (!teamId) {
            vscode.window.showErrorMessage('No team selected');
            return;
        }

        const currentProject = getCurrentProjectInfo();
        if (!currentProject) {
            vscode.window.showErrorMessage('No workspace folder is open. Please open the project you want to link to this team.');
            return;
        }

        // Confirm the action
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to update the team's project to:\n\n${getProjectDescription(currentProject)}\n\n` +
            `This will affect all team members and they may need to switch to this project.`,
            { modal: true },
            'Update Project',
            'Cancel'
        );

        if (confirm !== 'Update Project') {
            return;
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Updating team project...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 50, message: 'Saving project information...' });

            const result = await updateTeamProject(teamId);
            
            progress.report({ increment: 100, message: 'Update complete' });

            if (result.error) {
                vscode.window.showErrorMessage(`Failed to update team project: ${result.error}`);
            }
            // Success message is shown in the updateTeamProject function
        });
    }
);

/**
 * Command to check for project mismatches when switching teams
 */
export const checkTeamProjectCompatibilityCommand = vscode.commands.registerCommand(
    'collabAgent.checkTeamProjectCompatibility',
    async (teamId: string): Promise<boolean> => {
        const result = await validateTeamProject(teamId);
        
        if (result.error) {
            vscode.window.showErrorMessage(`Cannot validate team project: ${result.error}`);
            return false;
        }

        if (!result.team || !result.currentProject) {
            return false;
        }

        if (!result.isValid) {
            const action = await handleProjectMismatch(result.team, result.currentProject);
            
            switch (action) {
                case 'switch':
                    await openTeamProject(result.team);
                    return false; // User needs to switch projects
                case 'continue':
                    return true; // User chose to continue despite mismatch
                case 'cancel':
                    return false; // User cancelled
            }
        }

        return true; // Project matches
    }
);

/**
 * Command to open the team's project (for switching)
 */
export const openTeamProjectCommand = vscode.commands.registerCommand(
    'collabAgent.openTeamProject',
    async (teamId?: string) => {
        if (!teamId) {
            vscode.window.showErrorMessage('No team selected');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Opening team project...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 50, message: 'Getting team information...' });

            const { team, error } = await validateTeamProject(teamId);
            
            if (error || !team) {
                vscode.window.showErrorMessage(`Cannot open team project: ${error || 'Team not found'}`);
                return;
            }

            progress.report({ increment: 75, message: 'Opening project...' });

            const result = await openTeamProject(team);
            
            progress.report({ increment: 100, message: 'Complete' });

            if (result.error) {
                vscode.window.showErrorMessage(`Failed to open project: ${result.error}`);
            }
        });
    }
);

/**
 * Utility function to automatically validate project when a team is selected
 * This can be called from other parts of the extension
 */
export async function autoValidateTeamProject(teamId: string): Promise<{ canProceed: boolean; reason?: string }> {
    try {
        const result = await validateTeamProject(teamId);
        
        if (result.error) {
            return { canProceed: false, reason: result.error };
        }

        if (!result.team || !result.currentProject) {
            return { canProceed: false, reason: 'Missing team or project information' };
        }

        if (result.isValid) {
            return { canProceed: true };
        }

        // Project mismatch - show warning but allow user to choose
        const action = await handleProjectMismatch(result.team, result.currentProject);
        
        switch (action) {
            case 'continue':
                return { canProceed: true, reason: 'User chose to continue with project mismatch' };
            case 'switch':
                await openTeamProject(result.team);
                return { canProceed: false, reason: 'User is switching to team project' };
            case 'cancel':
                return { canProceed: false, reason: 'User cancelled due to project mismatch' };
            default:
                return { canProceed: false, reason: 'Unknown user action' };
        }
    } catch (error) {
        return { canProceed: false, reason: `Validation error: ${error}` };
    }
}