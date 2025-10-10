import * as vscode from 'vscode';
import { getAuthContext } from './auth-service';

// Team-related types
export interface Team {
    id: string;
    lobby_name: string;
    created_by: string;
    join_code: string;
    created_at: string;
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

/**
 * Generates a random 6-character alphanumeric team join code
 */
function generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Gets Supabase client instance for database operations
 */
async function getSupabaseClient() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const config = vscode.workspace.getConfiguration('collabAgent');
        const supabaseUrl = config.get<string>('supabase.url');
        const supabaseKey = config.get<string>('supabase.anonKey');
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing. Please configure supabase.url and supabase.anonKey in settings.');
        }
        
        return createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        throw new Error(`Failed to initialize Supabase client: ${error}`);
    }
}

/**
 * Creates a new team with the authenticated user as admin
 */
export async function createTeam(lobbyName: string): Promise<{ team?: Team; joinCode?: string; error?: string }> {
    try {
        // Check authentication
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to create a team' };
        }

        const supabase = await getSupabaseClient();
        const joinCode = generateJoinCode();

        // Create team record
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert({
                lobby_name: lobbyName,
                created_by: user.id,
                join_code: joinCode
            })
            .select()
            .single();

        if (teamError) {
            // Handle duplicate join code by retrying with new code
            if (teamError.code === '23505' && teamError.message.includes('join_code')) {
                return createTeam(lobbyName); // Retry with new code
            }
            return { error: `Failed to create team: ${teamError.message}` };
        }

        // Add creator as admin member
        const { error: memberError } = await supabase
            .from('team_membership')
            .insert({
                team_id: teamData.id,
                user_id: user.id,
                role: 'admin'
            });

        if (memberError) {
            // Cleanup: delete team if membership creation fails
            await supabase.from('teams').delete().eq('id', teamData.id);
            return { error: `Failed to add team membership: ${memberError.message}` };
        }

        return { team: teamData, joinCode };
    } catch (error) {
        return { error: `Team creation failed: ${error}` };
    }
}

/**
 * Joins a team using a join code
 */
export async function joinTeam(joinCode: string): Promise<{ team?: Team; error?: string }> {
    try {
        // Check authentication
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to join a team' };
        }

        const supabase = await getSupabaseClient();

        // Find team by join code
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('join_code', joinCode.toUpperCase())
            .single();

        if (teamError || !teamData) {
            return { error: 'Invalid join code or team not found' };
        }

        // Check if user is already a member
        const { data: existingMembership } = await supabase
            .from('team_membership')
            .select('*')
            .eq('team_id', teamData.id)
            .eq('user_id', user.id)
            .single();

        if (existingMembership) {
            return { error: 'You are already a member of this team' };
        }

        // Add user as member
        const { error: memberError } = await supabase
            .from('team_membership')
            .insert({
                team_id: teamData.id,
                user_id: user.id,
                role: 'member'
            });

        if (memberError) {
            return { error: `Failed to join team: ${memberError.message}` };
        }

        return { team: teamData };
    } catch (error) {
        return { error: `Team join failed: ${error}` };
    }
}

/**
 * Gets all teams the current user is a member of
 */
export async function getUserTeams(): Promise<{ teams?: TeamWithMembership[]; error?: string }> {
    try {
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated to get teams' };
        }

        const supabase = await getSupabaseClient();

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
            .eq('user_id', user.id);

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

/**
 * Gets team details by ID (only if user is a member)
 */
export async function getTeamById(teamId: string): Promise<{ team?: TeamWithMembership; error?: string }> {
    try {
        const { context: user, error: authError } = await getAuthContext();
        if (authError || !user?.isAuthenticated) {
            return { error: 'User must be authenticated' };
        }

        const supabase = await getSupabaseClient();

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
            .eq('user_id', user.id)
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