import * as vscode from 'vscode';
import axios, { AxiosResponse } from 'axios';

export interface JiraIssue {
    id: string;
    key: string;
    fields: {
        summary: string;
        description?: string;
        status: {
            name: string;
        };
        priority?: {
            name: string;
        };
        assignee?: {
            displayName: string;
            emailAddress?: string;
        };
        reporter: {
            displayName: string;
        };
        created: string;
        updated: string;
        issuetype: {
            name: string;
        };
    };
}

export interface JiraConfig {
    id?: string;
    team_id: string;
    jira_url: string;
    jira_project_key: string;
    access_token: string;
    refresh_token?: string;
    admin_user_id: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Service for integrating with Jira REST API.
 * Handles authentication, issue fetching, and team-specific configurations.
 */
export class JiraService {
    private static instance: JiraService;
    private readonly baseUrl: string;

    private constructor() {
        // Use Flask server URL - default to localhost:8080
        this.baseUrl = process.env.FLASK_SERVER_URL || 'http://localhost:8080';
    }

    public static getInstance(): JiraService {
        if (!JiraService.instance) {
            JiraService.instance = new JiraService();
        }
        return JiraService.instance;
    }

    /**
     * Initiates Jira OAuth flow for team admin.
     * Opens browser for Jira authorization and handles callback.
     */
    public async initiateJiraAuth(teamId: string, adminUserId: string): Promise<void> {
        // For Jira Cloud, we'll use API tokens instead of full OAuth
        // This is simpler and more common for Jira integrations

        const jiraUrl = await vscode.window.showInputBox({
            prompt: 'Enter your Jira instance URL',
            placeHolder: 'https://yourcompany.atlassian.net',
            validateInput: (value) => {
                if (!value) return 'Jira URL is required';
                try {
                    const url = new URL(value);
                    if (!url.hostname.includes('atlassian.net') && !url.hostname.includes('jira.com')) {
                        return 'Please enter a valid Jira Cloud URL (atlassian.net) or Jira Server URL';
                    }
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });

        if (!jiraUrl) return;

        const email = await vscode.window.showInputBox({
            prompt: 'Enter your Jira email address',
            placeHolder: 'your.email@company.com',
            validateInput: (value) => {
                if (!value) return 'Email is required';
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value) ? null : 'Please enter a valid email address';
            }
        });

        if (!email) return;

        const apiToken = await vscode.window.showInputBox({
            prompt: 'Enter your Jira API token',
            placeHolder: 'ATATT3xFfGF0...',
            password: true,
            validateInput: (value) => {
                if (!value) return 'API token is required';
                if (value.length < 20) return 'API token appears to be too short';
                return null;
            }
        });

        if (!apiToken) return;

        // Test the connection
        const isValid = await this.testJiraConnection(jiraUrl, email, apiToken);
        if (!isValid) {
            vscode.window.showErrorMessage('Failed to connect to Jira. Please check your credentials and try again.');
            return;
        }

        // Get project key
        const projectKey = await this.getProjectKey(jiraUrl, email, apiToken);
        if (!projectKey) return;

        // Save configuration
        await this.saveJiraConfig({
            team_id: teamId,
            jira_url: jiraUrl,
            jira_project_key: projectKey,
            access_token: Buffer.from(`${email}:${apiToken}`).toString('base64'), // Basic auth encoded
            admin_user_id: adminUserId
        });

        vscode.window.showInformationMessage('Jira integration configured successfully! Tasks will be available for all team members.');
    }

    /**
     * Tests Jira connection with provided credentials.
     */
    private async testJiraConnection(jiraUrl: string, email: string, apiToken: string): Promise<boolean> {
        try {
            const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
            const response = await axios.get(`${jiraUrl}/rest/api/3/myself`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            return response.status === 200;
        } catch (error) {
            console.error('Jira connection test failed:', error);
            return false;
        }
    }

    /**
     * Gets project key from user selection.
     */
    private async getProjectKey(jiraUrl: string, email: string, apiToken: string): Promise<string | null> {
        try {
            const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
            const response = await axios.get(`${jiraUrl}/rest/api/3/project`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            const projects = response.data;
            if (!projects || projects.length === 0) {
                vscode.window.showErrorMessage('No projects found in your Jira instance.');
                return null;
            }

            const projectItems = projects.map((p: any) => ({
                label: `${p.key} - ${p.name}`,
                description: p.projectTypeKey,
                project: p
            }));

            const selected = await vscode.window.showQuickPick(projectItems, {
                placeHolder: 'Select the project to integrate with'
            });

            return selected ? (selected as any).project.key : null;
        } catch (error) {
            console.error('Failed to fetch Jira projects:', error);
            vscode.window.showErrorMessage('Failed to fetch projects from Jira.');
            return null;
        }
    }

    /**
     * Saves Jira configuration for a team.
     */
    private async saveJiraConfig(config: JiraConfig): Promise<void> {
        try {
            // Call server endpoint to save Jira config
            const response = await axios.post(`${this.baseUrl}/api/jira/config`, config, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error('Failed to save Jira configuration');
            }
        } catch (error) {
            console.error('Failed to save Jira config:', error);
            throw error;
        }
    }

    /**
     * Fetches Jira configuration for a team.
     */
    public async getJiraConfig(teamId: string): Promise<JiraConfig | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/jira/config/${teamId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch Jira config:', error);
            return null;
        }
    }

    /**
     * Fetches issues from Jira for a team.
     */
    public async fetchTeamIssues(teamId: string): Promise<JiraIssue[]> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        try {
            const jql = `project = ${config.jira_project_key}`;
            const response = await axios.post(`${config.jira_url}/rest/api/3/search/jql`, {
                jql: jql,
                startAt: 0,
                maxResults: 50,
                fields: ['summary', 'status', 'assignee', 'updated', 'reporter', 'created', 'issuetype', 'priority']
            }, {
                headers: {
                    'Authorization': `Basic ${config.access_token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'CollabAgent/1.0'
                },
                timeout: 15000
            });

            return response.data.issues || [];
        } catch (error) {
            console.error('Failed to fetch Jira issues:', error);
            throw new Error('Failed to fetch issues from Jira');
        }
    }

    /**
     * Removes Jira configuration for a team (admin only).
     */
    public async removeJiraConfig(teamId: string): Promise<void> {
        try {
            await axios.delete(`${this.baseUrl}/api/jira/config/${teamId}`);
        } catch (error) {
            console.error('Failed to remove Jira config:', error);
            throw error;
        }
    }
}
