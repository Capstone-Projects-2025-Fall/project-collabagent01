import * as vscode from 'vscode';
import { getAuthContext } from './auth-service';
import { insertParticipantStatusEvent } from './team-activity-service';
import { ProjectInfo, getCurrentProjectInfo, validateCurrentProject, getProjectDescription } from './project-detection-service';
import { verifyGitHubPushAccess, isGitHubRepository, promptGitHubVerification } from './github-verification-service';

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

    // GitHub verification fields
    verified?: boolean;
    verification_method?: string;
    verified_by?: string;
    verified_at?: string;
    github_repo_id?: string;
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

        // Optional GitHub verification - silently checks if user has a token
        // If they do and have access, great! If not, no problem - just create unverified team
        let verificationData: {
            verified: boolean;
            verification_method: string;
            github_repo_id?: string;
        } = {
            verified: false,
            verification_method: 'none'
        };

        // Try to verify silently (doesn't block team creation if it fails)
        if (currentProject.remoteUrl && isGitHubRepository(currentProject.remoteUrl)) {
            try {
                const verificationResult = await verifyGitHubPushAccess(currentProject.remoteUrl);

                if (verificationResult.hasAccess) {
                    // User has a token AND has access - mark as verified
                    verificationData = {
                        verified: true,
                        verification_method: 'github_token',
                        github_repo_id: verificationResult.repoInfo?.repoId.toString()
                    };
                    console.log('[Team Creation] ✓ Repository verified with GitHub token');
                } else {
                    // No token or no access - that's fine, just create unverified
                    console.log('[Team Creation] Creating unverified team (no token or no access)');
                }
            } catch (error) {
                // Any error - just create unverified team
                console.log('[Team Creation] Verification skipped, creating unverified team');
            }
        }

        // Get current user's auth ID for verified_by field
        const { data: { user: authUser }, error: authUserError } = await supabase.auth.getUser();
        if (authUserError || !authUser) {
            return { error: 'Failed to get current user for verification record.' };
        }

        // Use secure RPC which creates the team and adds the creator as admin
        const { data: teamData, error: rpcError } = await supabase.rpc('create_team', {
            p_lobby_name: lobbyName,
            p_project_name: currentProject.projectName,
            p_project_identifier: currentProject.projectHash,
            p_project_repo_url: currentProject.remoteUrl
        }).single();

        if (rpcError || !teamData) {
            // Check for duplicate team name error
            if (rpcError?.message?.includes('DUPLICATE_TEAM_NAME')) {
                return { error: 'A team with this name already exists. Please choose a different team name.' };
            }
            return { error: `Failed to create team: ${rpcError?.message || 'Unknown error'}` };
        }

        // Update team with verification data
        if (verificationData.verified) {
            const { error: updateError } = await supabase
                .from('teams')
                .update({
                    verified: verificationData.verified,
                    verification_method: verificationData.verification_method,
                    verified_by: authUser.id,
                    verified_at: new Date().toISOString(),
                    github_repo_id: verificationData.github_repo_id
                })
                .eq('id', teamData.id);

            if (updateError) {
                console.warn('[Team Creation] Failed to update verification data:', updateError);
                // Don't fail the team creation, just log the warning
            }
        }

        return { team: teamData, joinCode: teamData.join_code };
    } catch (error) {
        return { error: `Team creation failed: ${error}` };
    }
}


//Joins a team using a join code

export async function joinTeam(joinCode: string): Promise<{ team?: Team; error?: string; alreadyMember?: boolean }> {
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

        // If the user is already a member of this team, returns a already apart of team status
        const { data: existingMembership } = await supabase
            .from('team_membership')
            .select('id')
            .eq('team_id', teamData.id)
            .eq('user_id', authUser.id)
            .maybeSingle();

        if (existingMembership) {
            return { team: teamData, alreadyMember: true };
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

        // Emit participant status event (joined)
        try {
            await insertParticipantStatusEvent(teamData.id, authUser.id, [authUser.id], []);
        } catch (e) {
            console.warn('[joinTeam] Failed to insert participant status event:', e);
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

        // Emit participant status event (left)
        try {
            await insertParticipantStatusEvent(teamId, currentUser.user.id, [], [currentUser.user.id]);
        } catch (e) {
            console.warn('[leaveTeam] Failed to insert participant status event:', e);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: `Leave team failed: ${error}` };
    }
}

// Gets all members of a team (only accessible to team members)
export interface TeamMember {
    id: string;
    userId: string;
    role: 'member' | 'admin';
    joinedAt: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    skills?: string[];
}

export async function getTeamMembers(teamId: string): Promise<{ members?: TeamMember[]; error?: string }> {
    try {
        // Check authentication
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to view team members' };
        }

        const supabase = await getSupabaseClient();

        // Get current user's auth ID
        const { data: currentUser, error: getUserErr } = await supabase.auth.getUser();
        if (getUserErr || !currentUser.user) {
            return { error: 'User not authenticated' };
        }

        // Verify that the current user is a member of this team (security check)
        const { data: userMembership, error: membershipErr } = await supabase
            .from('team_membership')
            .select('id')
            .eq('team_id', teamId)
            .eq('user_id', currentUser.user.id)
            .maybeSingle();

        if (membershipErr || !userMembership) {
            return { error: 'You must be a member of this team to view its members' };
        }

        // Create an RPC function call to fetch team members with user data
        // This uses a stored procedure that can access auth.users with proper permissions
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_team_members_with_users', { p_team_id: teamId });

        if (rpcError) {
            // If RPC doesn't exist, fall back to basic query
            console.warn('[getTeamMembers] RPC function not available, using fallback:', rpcError);

            const { data: fallbackData, error: fallbackError } = await supabase
                .from('team_membership')
                .select('id, user_id, role, joined_at')
                .eq('team_id', teamId)
                .order('role', { ascending: false })
                .order('joined_at', { ascending: true });

            if (fallbackError) {
                console.error('[getTeamMembers] Fallback query failed:', fallbackError);
                return { error: `Failed to fetch team members: ${fallbackError.message}` };
            }

            // Fetch user profiles separately
            const userIds = fallbackData.map((m: any) => m.user_id);
            const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('user_id, name, strengths, interests')
                .in('user_id', userIds);

            console.log('[getTeamMembers] Profiles data fetched:', profilesData);
            if (profilesError) {
                console.error('[getTeamMembers] Error fetching profiles:', profilesError);
            }

            // Create a map of profiles
            const profilesMap = new Map(profilesData?.map((p: any) => [p.user_id, p]) || []);

            // Return members with user_profiles data
            const members: TeamMember[] = fallbackData.map((membership: any) => {
                const profile = profilesMap.get(membership.user_id) as any;
                console.log('[getTeamMembers] Profile for user', membership.user_id, ':', profile);

                // Try strengths first, then interests, handle both array and null
                let skills: string[] = [];
                if (profile?.strengths && Array.isArray(profile.strengths) && profile.strengths.length > 0) {
                    skills = profile.strengths;
                } else if (profile?.interests && Array.isArray(profile.interests) && profile.interests.length > 0) {
                    skills = profile.interests;
                }

                console.log('[getTeamMembers] Skills for user', membership.user_id, ':', skills);

                return {
                    id: membership.id,
                    userId: membership.user_id,
                    role: membership.role,
                    joinedAt: membership.joined_at,
                    email: membership.user_id, // Fallback - no auth.users access
                    displayName: profile?.name || undefined,
                    skills: skills,
                    firstName: undefined,
                    lastName: undefined
                };
            });

            return { members };
        }

        // Transform RPC response into TeamMember format
        const members: TeamMember[] = rpcData.map((row: any) => {
            let firstName: string | undefined;
            let lastName: string | undefined;

            // Parse full_name from user metadata if available
            if (row.full_name) {
                const nameParts = row.full_name.split(' ');
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ') || undefined;
            }

            // Get skills from user profile if available (from enhanced RPC)
            const skills = row.strengths || row.interests || [];

            return {
                id: row.membership_id,
                userId: row.user_id,
                role: row.role,
                joinedAt: row.joined_at,
                email: row.email || 'Unknown',
                displayName: row.display_name || row.full_name || undefined,
                firstName,
                lastName,
                skills: Array.isArray(skills) ? skills : []
            };
        });

        // Fetch user profiles for skills if not already included in RPC response
        if (members.length > 0 && !rpcData[0]?.strengths && !rpcData[0]?.interests) {
            console.log('[getTeamMembers] RPC did not include skills, fetching from user_profiles...');
            const userIds = members.map(m => m.userId);

            const { data: profilesData, error: profilesError } = await supabase
                .from('user_profiles')
                .select('user_id, name, strengths, interests')
                .in('user_id', userIds);

            if (!profilesError && profilesData) {
                // Map profiles to members
                const profilesMap = new Map(profilesData.map((p: any) => [p.user_id, p]));

                members.forEach(member => {
                    const profile = profilesMap.get(member.userId) as any;
                    if (profile) {
                        member.skills = profile.strengths || profile.interests || [];
                        if (!member.displayName && profile.name) {
                            member.displayName = profile.name;
                        }
                    }
                });
            }
        }

        return { members };
    } catch (error) {
        return { error: `Failed to get team members: ${error}` };
    }
}