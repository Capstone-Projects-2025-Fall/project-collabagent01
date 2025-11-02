import * as vscode from 'vscode';

/**
 * Service for verifying GitHub repository access permissions
 * Used to ensure team creators have push access to the repositories they're linking
 */

export interface GitHubRepoInfo {
    owner: string;
    repo: string;
    fullName: string;  // e.g., "microsoft/vscode"
    repoId: number;
    htmlUrl: string;
}

export interface GitHubPermissionCheck {
    hasAccess: boolean;
    permission?: string;  // 'admin', 'write', 'read', 'none'
    repoInfo?: GitHubRepoInfo;
    error?: string;
}

/**
 * Extracts owner and repo name from a GitHub repository URL
 * Supports both HTTPS and SSH formats
 */
export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
    try {
        // Normalize the URL
        let normalized = url.trim();

        // Handle SSH format: git@github.com:owner/repo.git
        const sshMatch = normalized.match(/git@github\.com:([^\/]+)\/(.+?)(?:\.git)?$/);
        if (sshMatch) {
            return {
                owner: sshMatch[1],
                repo: sshMatch[2].replace(/\.git$/, '')
            };
        }

        // Handle HTTPS format: https://github.com/owner/repo or https://github.com/owner/repo.git
        const httpsMatch = normalized.match(/(?:https?:\/\/)?github\.com\/([^\/]+)\/(.+?)(?:\.git)?$/);
        if (httpsMatch) {
            return {
                owner: httpsMatch[1],
                repo: httpsMatch[2].replace(/\.git$/, '')
            };
        }

        return null;
    } catch (error) {
        console.error('[GitHub Verification] Error parsing repo URL:', error);
        return null;
    }
}

/**
 * Checks if the authenticated user has push access to a GitHub repository
 * Uses Supabase GitHub OAuth token to call GitHub API
 */
export async function verifyGitHubPushAccess(repoUrl: string): Promise<GitHubPermissionCheck> {
    try {
        // Parse the repository URL
        const parsed = parseGitHubRepoUrl(repoUrl);
        if (!parsed) {
            return {
                hasAccess: false,
                error: 'Invalid GitHub repository URL. Please provide a valid GitHub URL (e.g., https://github.com/owner/repo)'
            };
        }

        const { owner, repo } = parsed;

        // Get GitHub access token from Supabase session
        const token = await getGitHubAccessToken();
        if (!token) {
            return {
                hasAccess: false,
                error: 'Not authenticated with GitHub. Please sign in with GitHub to verify repository access.'
            };
        }

        // Fetch repository information from GitHub API
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'CollabAgent-VSCode'
            }
        });

        if (!repoResponse.ok) {
            if (repoResponse.status === 404) {
                return {
                    hasAccess: false,
                    error: `Repository not found: ${owner}/${repo}. Either the repository doesn't exist or you don't have access to it.`
                };
            } else if (repoResponse.status === 401) {
                return {
                    hasAccess: false,
                    error: 'GitHub authentication failed. Please try signing in again.'
                };
            }
            return {
                hasAccess: false,
                error: `Failed to access repository: ${repoResponse.statusText}`
            };
        }

        const repoData = await repoResponse.json();

        const repoInfo: GitHubRepoInfo = {
            owner: repoData.owner.login,
            repo: repoData.name,
            fullName: repoData.full_name,
            repoId: repoData.id,
            htmlUrl: repoData.html_url
        };

        // Check permissions
        // repoData.permissions: { admin: boolean, push: boolean, pull: boolean }
        const permissions = repoData.permissions;

        if (!permissions) {
            return {
                hasAccess: false,
                repoInfo,
                error: 'Unable to determine repository permissions. You may not have access to this repository.'
            };
        }

        // Determine permission level
        let permissionLevel: string;
        if (permissions.admin) {
            permissionLevel = 'admin';
        } else if (permissions.push) {
            permissionLevel = 'write';
        } else if (permissions.pull) {
            permissionLevel = 'read';
        } else {
            permissionLevel = 'none';
        }

        // User needs at least 'push' (write) access to create a team
        const hasRequiredAccess = permissions.admin || permissions.push;

        if (!hasRequiredAccess) {
            return {
                hasAccess: false,
                permission: permissionLevel,
                repoInfo,
                error: `Insufficient permissions for ${owner}/${repo}. You need push (write) or admin access to create a team with this repository.`
            };
        }

        return {
            hasAccess: true,
            permission: permissionLevel,
            repoInfo
        };

    } catch (error: any) {
        console.error('[GitHub Verification] Error:', error);
        return {
            hasAccess: false,
            error: `Verification failed: ${error.message || 'Unknown error'}`
        };
    }
}

/**
 * Gets the GitHub access token from VS Code global state or Supabase session
 */
async function getGitHubAccessToken(): Promise<string | null> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { globalContext } = require('../extension');

        // Try to get cached token from global state first
        const cachedToken = globalContext?.globalState.get('github_access_token') as string | undefined;
        if (cachedToken) {
            console.log('[GitHub Verification] Using cached GitHub token');
            return cachedToken;
        }

        // Fallback: try to get from current Supabase session (only works immediately after OAuth)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getSupabase } = require('../auth/supabaseClient');
        const supabase = getSupabase();

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            console.log('[GitHub Verification] No active session');
            return null;
        }

        // GitHub OAuth provider tokens are stored in session.provider_token
        const githubToken = session.provider_token;

        if (githubToken) {
            // Cache it for future use
            console.log('[GitHub Verification] Found provider token, caching it');
            await globalContext?.globalState.update('github_access_token', githubToken);
            return githubToken;
        }

        console.log('[GitHub Verification] No GitHub provider token found in session');
        return null;
    } catch (error) {
        console.error('[GitHub Verification] Error getting GitHub token:', error);
        return null;
    }
}

/**
 * Stores the GitHub access token for future use
 * This should be called after successful GitHub OAuth
 */
export async function storeGitHubAccessToken(token: string): Promise<void> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { globalContext } = require('../extension');
        await globalContext?.globalState.update('github_access_token', token);
        console.log('[GitHub Verification] GitHub token stored successfully');
    } catch (error) {
        console.error('[GitHub Verification] Error storing GitHub token:', error);
    }
}

/**
 * Clears the stored GitHub access token (on sign out)
 */
export async function clearGitHubAccessToken(): Promise<void> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { globalContext } = require('../extension');
        await globalContext?.globalState.update('github_access_token', undefined);
        console.log('[GitHub Verification] GitHub token cleared');
    } catch (error) {
        console.error('[GitHub Verification] Error clearing GitHub token:', error);
    }
}

/**
 * Prompts user to verify their GitHub repository access
 * Shows clear error messages and guidance if verification fails
 */
export async function promptGitHubVerification(repoUrl: string): Promise<GitHubPermissionCheck> {
    // Show loading message
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Verifying GitHub repository access...',
        cancellable: false
    }, async () => {
        const result = await verifyGitHubPushAccess(repoUrl);

        if (result.hasAccess) {
            vscode.window.showInformationMessage(
                `✓ Verified: You have ${result.permission} access to ${result.repoInfo?.fullName}`
            );
        } else {
            vscode.window.showErrorMessage(
                `GitHub Verification Failed: ${result.error}`
            );
        }

        return result;
    });
}

/**
 * Checks if a repository URL is a GitHub repository
 */
export function isGitHubRepository(repoUrl: string | undefined): boolean {
    if (!repoUrl) return false;
    return repoUrl.includes('github.com');
}
