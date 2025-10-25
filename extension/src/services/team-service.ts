import * as vscode from 'vscode';
import { getAuthContext } from './auth-service';
import { ProjectInfo, getCurrentProjectInfo, validateCurrentProject, getProjectDescription } from './project-detection-service';

// Team-related types
export interface Team {
    id: string;
    lobby_name: string;
    created_by: string;
    join_code: string;
    created_at: string;
    project_repo_url?: string;
    project_identifier: string;
    project_name?: string;
}

export interface TeamMembership {
    id: string;
    team_id: string;
    user_id: string;
    role: 'member' | 'admin';
    joined_at: string;
}

export interface TeamWithMembership extends Team {
    role: 'member' | 'admin';
}


//Generates a random 6-character alphanumeric team join code
 
function generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


//Gets the shared Supabase client instance for database operations (uses current user session)
async function getSupabaseClient() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSupabase } = require('../auth/supabaseClient');
        return getSupabase();
    } catch (error) {
        throw new Error(`Failed to initialize Supabase client: ${error}`);
    }
}


//Creates a new team with the authenticated user as admin, automatically linking it to the current project

export async function createTeam(lobbyName: string): Promise<{ team?: Team; joinCode?: string; error?: string }> {
    try {
        // Check authentication
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to create a team' };
        }

        // Get current project information
        const currentProject = getCurrentProjectInfo();
        if (!currentProject) {
            return { error: 'No workspace folder is open. Please open a project folder to create a team.' };
        }

        // Enforce Git requirement for team functionality
        if (!currentProject.isGitRepo || !currentProject.remoteUrl) {
            return { 
                error: 'Team functionality requires a Git repository with a remote origin.\n\n' +
                       'To create a team:\n' +
                       '1. Initialize Git: git init\n' +
                       '2. Add remote origin: git remote add origin <repository-url>\n' +
                       '3. Push your code to the remote repository\n\n' +
                       'All team members must have the same Git repository cloned locally.'
            };
        }

        const supabase = await getSupabaseClient();

        // Use secure RPC which creates the team and adds the creator as admin
        const { data: teamData, error: rpcError } = await supabase.rpc('create_team', {
            p_lobby_name: lobbyName,
            p_project_name: currentProject.projectName,
            p_project_identifier: currentProject.projectHash,
            p_project_repo_url: currentProject.remoteUrl
        }).single();

        if (rpcError || !teamData) {
            return { error: `Failed to create team: ${rpcError?.message || 'Unknown error'}` };
        }

        return { team: teamData, joinCode: teamData.join_code };
    } catch (error) {
        return { error: `Team creation failed: ${error}` };
    }
}


//Joins a team using a join code

export async function joinTeam(joinCode: string): Promise<{ team?: Team; error?: string }> {
    try {
        // Check authentication
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to join a team' };
        }

        // Check current project Git requirements
        const currentProject = getCurrentProjectInfo();
        if (!currentProject) {
            return { error: 'No workspace folder is open. Please open the project folder to join a team.' };
        }

        if (!currentProject.isGitRepo || !currentProject.remoteUrl) {
            return { 
                error: 'Team functionality requires a Git repository with a remote origin.\n\n' +
                       'To join a team, you must have the team\'s Git repository cloned locally:\n' +
                       '1. Clone the team\'s repository: git clone <repository-url>\n' +
                       '2. Open the cloned project folder in VS Code\n' +
                       '3. Then try joining the team again\n\n' +
                       'Make sure you have the correct repository that matches the team\'s project.'
            };
        }

        const supabase = await getSupabaseClient();

        // Get the current Supabase auth user
        const { data: { user: authUser }, error: authUserError } = await supabase.auth.getUser();
        if (authUserError || !authUser) {
            return { error: `Failed to get current user: ${authUserError?.message || 'No user in session'}` };
        }

        // Find team by join code via secure RPC (bypasses RLS safely)
        const { data: teamData, error: teamError } = await supabase
            .rpc('get_team_by_join_code', { p_join_code: joinCode.toUpperCase() })
            .maybeSingle();

        if (teamError || !teamData) {
            return { error: `Invalid join code or team not found${teamError ? `: ${teamError.message}` : ''}` };
        }

        // CRITICAL: Validate that user's current project matches team's project
        const { validateCurrentProject } = require('./project-detection-service');
        const validation = validateCurrentProject(teamData.project_identifier, teamData.project_repo_url);
        
        if (!validation.isMatch) {
            const teamRepoUrl = teamData.project_repo_url || 'the team repository';
            const currentRepoUrl = validation.currentProject?.remoteUrl || 'your current project';
            
            return { 
                error: `Project mismatch! You cannot join this team.\n\n` +
                       `Team Repository: ${teamRepoUrl}\n` +
                       `Your Repository: ${currentRepoUrl}\n\n` +
                       `To join team "${teamData.lobby_name}":\n` +
                       `1. Clone the team repository: git clone ${teamRepoUrl}\n` +
                       `2. Open the cloned folder in VS Code\n` +
                       `3. Try joining again with the same join code\n\n` +
                       `${validation.reason || 'Repository URLs do not match'}`
            };
        }

        // Add user as member using secure RPC
        const { error: joinErr } = await supabase
            .rpc('join_team_by_code', { p_join_code: joinCode.toUpperCase() });

        if (joinErr) {
            return { error: `Failed to join team: ${joinErr.message}` };
        }

        return { team: teamData };
    } catch (error) {
        return { error: `Team join failed: ${error}` };
    }
}


//Gets all teams the current user is a member of

export async function getUserTeams(): Promise<{ teams?: TeamWithMembership[]; error?: string }> {
    try {
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to get teams' };
        }

        const supabase = await getSupabaseClient();

        // Get the current Supabase auth user
        const { data: currentUser, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr || !currentUser.user) {
            return { error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('team_membership')
            .select(`
                role,
                teams (
                    id,
                    lobby_name,
                    created_by,
                    join_code,
                    created_at,
                    project_identifier,
                    project_repo_url,
                    project_name
                )
            `)
            .eq('user_id', currentUser.user.id);

        if (error) {
            return { error: `Failed to get teams: ${error.message}` };
        }

        const teams: TeamWithMembership[] = data.map((membership: any) => ({
            ...membership.teams,
            role: membership.role
        }));

        return { teams };
    } catch (error) {
        return { error: `Get teams failed: ${error}` };
    }
}

//Gets team details by ID (only if user is a member)
export async function getTeamById(teamId: string): Promise<{ team?: TeamWithMembership; error?: string }> {
    try {
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated' };
        }

        const supabase = await getSupabaseClient();

        const { data: currentUser, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr || !currentUser.user) {
            return { error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('team_membership')
            .select(`
                role,
                teams (
                    id,
                    lobby_name,
                    created_by,
                    join_code,
                    created_at
                )
            `)
            .eq('team_id', teamId)
            .eq('user_id', currentUser.user.id)
            .single();

        if (error || !data) {
            return { error: 'Team not found or access denied' };
        }

        const team: TeamWithMembership = {
            ...data.teams,
            role: data.role
        };

        return { team };
    } catch (error) {
        return { error: `Get team failed: ${error}` };
    }
}


//Validates if the current workspace matches the team's project
export async function validateTeamProject(teamId: string): Promise<{
    isValid: boolean;
    team?: Team;
    currentProject?: ProjectInfo;
    error?: string;
    validationMessage?: string;
}> {
    try {
        // Get team information
        const { team, error: teamError } = await getTeamById(teamId);
        if (teamError || !team) {
            return { isValid: false, error: teamError || 'Team not found' };
        }

        // Get current project info
        const currentProject = getCurrentProjectInfo();
        if (!currentProject) {
            return {
                isValid: false,
                team,
                error: 'No workspace folder is currently open'
            };
        }

        // Validate project match
        const validation = validateCurrentProject(team.project_identifier, team.project_repo_url);
        
        return {
            isValid: validation.isMatch,
            team,
            currentProject: validation.currentProject || undefined,
            validationMessage: validation.reason
        };
    } catch (error) {
        return { isValid: false, error: `Validation failed: ${error}` };
    }
}

//Shows a warning dialog when project mismatch is detected
export async function handleProjectMismatch(team: Team, currentProject: ProjectInfo): Promise<'continue' | 'switch' | 'cancel'> {
    const teamProjectDesc = team.project_repo_url 
        ? `${team.project_name || 'Team Project'} (${team.project_repo_url})`
        : team.project_name || 'Team Project';
    
    const currentProjectDesc = getProjectDescription(currentProject);
    
    const action = await vscode.window.showWarningMessage(
        `Project Mismatch Detected!\n\n` +
        `Your team is linked to: ${teamProjectDesc}\n` +
        `But you have open: ${currentProjectDesc}\n\n` +
        `This could lead to tracking issues or unintended changes being shared with your team.`,
        { modal: true },
        'Continue Anyway',
        'Switch to Team Project',
        'Cancel'
    );

    switch (action) {
        case 'Continue Anyway':
            return 'continue';
        case 'Switch to Team Project':
            return 'switch';
        default:
            return 'cancel';
    }
}


//Attempts to open the team's project in VS Code
export async function openTeamProject(team: Team): Promise<{ success: boolean; error?: string }> {
    try {
        if (team.project_repo_url) {
            // If it's a Git repository, suggest cloning it
            const cloneAction = await vscode.window.showInformationMessage(
                `To work on the team project, you need to clone the repository:\n${team.project_repo_url}`,
                'Clone Repository',
                'Cancel'
            );

            if (cloneAction === 'Clone Repository') {
                await vscode.commands.executeCommand('git.clone', team.project_repo_url);
                return { success: true };
            }
        } else {
            // If it's not a Git repo, we can't automatically switch
            await vscode.window.showInformationMessage(
                `This team is linked to a local project: ${team.project_name}\n\n` +
                `Please manually open the correct project folder in VS Code.`,
                'OK'
            );
        }
        
        return { success: false };
    } catch (error) {
        return { success: false, error: `Failed to open project: ${error}` };
    }
}

//Gets a user-friendly description of the team's project
export function getTeamProjectDescription(team: Team): string {
    if (team.project_repo_url) {
        return `${team.project_name || 'Team Project'} (${team.project_repo_url})`;
    }
    return team.project_name || 'Local Project';
}


//Updates a team's project information (admin only)
export async function updateTeamProject(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if user is admin of the team
        const { team, error: teamError } = await getTeamById(teamId);
        if (teamError || !team) {
            return { success: false, error: teamError || 'Team not found' };
        }

        if (team.role !== 'admin') {
            return { success: false, error: 'Only team admins can update project information' };
        }

        // Get current project information
        const currentProject = getCurrentProjectInfo();
        if (!currentProject) {
            return { success: false, error: 'No workspace folder is open. Please open the project you want to link to this team.' };
        }

        const supabase = await getSupabaseClient();

        // Update team with new project information
        const { error: updateError } = await supabase
            .from('teams')
            .update({
                project_repo_url: currentProject.remoteUrl,
                project_identifier: currentProject.projectHash,
                project_name: currentProject.projectName
            })
            .eq('id', teamId);

        if (updateError) {
            return { success: false, error: `Failed to update team project: ${updateError.message}` };
        }

        await vscode.window.showInformationMessage(
            `Team project updated!\n\nTeam "${team.lobby_name}" is now linked to: ${getProjectDescription(currentProject)}`
        );

        return { success: true };
    } catch (error) {
        return { success: false, error: `Update failed: ${error}` };
    }
}

// Deletes a team (admin only). Removes memberships first, then deletes the team.
export async function deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Ensure authenticated
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { success: false, error: 'User must be authenticated to delete a team' };
        }

        const supabase = await getSupabaseClient();

        // Get current user id from session
        const { data: currentUser, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr || !currentUser.user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Check admin role for this team
        const { data: membership, error: membershipErr } = await supabase
            .from('team_membership')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', currentUser.user.id)
            .single();

        if (membershipErr || !membership) {
            return { success: false, error: 'You are not a member of this team or access is denied' };
        }
        if (membership.role !== 'admin') {
            return { success: false, error: 'Only the Team Admin can delete this team' };
        }

        // Perform deletion via secure RPC to avoid RLS no-op deletes
        const { data: deletedOk, error: deleteTeamErr } = await supabase
            .rpc('delete_team', { p_team_id: teamId });
        if (deleteTeamErr || deletedOk !== true) {
            return { success: false, error: deleteTeamErr?.message || 'Failed to delete team' };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: `Delete failed: ${error}` };
    }
}

// Leaves a team (member only): removes the current user's membership row for the team
export async function leaveTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Ensure authenticated
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { success: false, error: 'User must be authenticated to leave a team' };
        }

        const supabase = await getSupabaseClient();

        // Get current user's id
        const { data: currentUser, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr || !currentUser.user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Ensure the user is a member of this team
        const { data: membership, error: membershipErr } = await supabase
            .from('team_membership')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', currentUser.user.id)
            .maybeSingle();

        if (membershipErr) {
            return { success: false, error: `Failed to check membership: ${membershipErr.message}` };
        }
        if (!membership) {
            return { success: false, error: 'You are not a member of this team' };
        }
        if (membership.role === 'admin') {
            return { success: false, error: 'Team admins cannot leave the team they administer. Transfer admin role or delete the team.' };
        }

        // Use secure RPC to ensure we know if a row was actually deleted
        const { data: leftOk, error: deleteErr } = await supabase
            .rpc('leave_team', { p_team_id: teamId });

        if (deleteErr || leftOk !== true) {
            return { success: false, error: deleteErr?.message || 'Unable to leave team (no membership removed)' };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: `Leave team failed: ${error}` };
    }
}