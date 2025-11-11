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
            id: string;
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
        sprint?: any;
    };
}

export interface JiraSprint {
    id: number;
    name: string;
    state: 'active' | 'future' | 'closed';
    startDate?: string;
    endDate?: string;
    completeDate?: string;
    originBoardId: number;
}

export interface JiraTransition {
    id: string;
    name: string;
    to: {
        id: string;
        name: string;
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
        // Use Flask server URL - default to localhost:5000 (Flask default port)
        this.baseUrl = process.env.FLASK_SERVER_URL || 'http://localhost:5000';
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
            console.log('Testing Jira connection to:', jiraUrl);
            console.log('Using email:', email);
            console.log('Auth header (first 20 chars):', `Basic ${auth.substring(0, 20)}...`);

            const response = await axios.get(`${jiraUrl}/rest/api/3/myself`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            console.log('Jira connection successful! User:', response.data.displayName);
            return response.status === 200;
        } catch (error: any) {
            console.error('Jira connection test failed:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });

            // Provide helpful error message
            if (error.response?.status === 401) {
                vscode.window.showErrorMessage(
                    'Jira authentication failed. Please verify:\n' +
                    '1. Your email address is correct\n' +
                    '2. Your API token is correct (generate a new one if needed)\n' +
                    '3. You have access to this Jira instance'
                );
            }
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
            const response = await axios.get(`${this.baseUrl}/api/jira/config/${teamId}`, {
                timeout: 10000
            });
            return response.data;
        } catch (error: any) {
            // 404 means no config exists yet - this is expected
            if (error.response?.status === 404) {
                return null;
            }
            console.error('Failed to fetch Jira config:', error.message);
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

        // Build JQL query - get all issues from the project
        const jql = `project = ${config.jira_project_key} ORDER BY updated DESC`;
        const searchUrl = `${config.jira_url}/rest/api/3/search/jql`;

        try {
            console.log('Fetching Jira issue IDs:', {
                url: searchUrl,
                jql: jql,
                projectKey: config.jira_project_key
            });

            // Step 1: Get issue IDs using /search/jql (only accepts JQL string in body)
            const searchResponse = await axios.post(searchUrl, { jql }, {
                headers: {
                    'Authorization': `Basic ${config.access_token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const issueIds = searchResponse.data.issues || [];
            console.log(`Fetched ${issueIds.length} issue IDs from Jira`);

            if (issueIds.length === 0) {
                return [];
            }

            // Step 2: Fetch full details for each issue
            // Limit to first 100 to show more tasks
            const limitedIds = issueIds.slice(0, 100);
            const issueDetailsPromises = limitedIds.map(async (issue: any) => {
                const issueUrl = `${config.jira_url}/rest/api/3/issue/${issue.id}`;
                try {
                    const detailResponse = await axios.get(issueUrl, {
                        headers: {
                            'Authorization': `Basic ${config.access_token}`,
                            'Accept': 'application/json'
                        },
                        params: {
                            fields: 'summary,status,assignee,updated,reporter,created,issuetype,priority'
                        },
                        timeout: 10000
                    });
                    return detailResponse.data;
                } catch (error) {
                    console.error(`Failed to fetch details for issue ${issue.id}:`, error);
                    return null;
                }
            });

            const issuesWithDetails = await Promise.all(issueDetailsPromises);
            const validIssues = issuesWithDetails.filter(issue => issue !== null);

            console.log(`Successfully fetched full details for ${validIssues.length} issues`);
            return validIssues;
        } catch (error: any) {
            console.error('Failed to fetch Jira issues:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                url: searchUrl,
                projectKey: config.jira_project_key,
                fullError: JSON.stringify(error.response?.data, null, 2)
            });

            // Log the exact error from Jira for debugging
            if (error.response?.data) {
                console.error('Jira error details:', error.response.data);
            }

            if (error.response?.status === 401) {
                throw new Error('Jira authentication failed. Please reconfigure the integration.');
            } else if (error.response?.status === 404) {
                throw new Error('Jira project not found. Please check the project key.');
            } else if (error.response?.status === 410) {
                throw new Error('Jira API endpoint deprecated or project archived. Please verify the project is active and accessible.');
            } else {
                throw new Error(`Failed to fetch issues from Jira: ${error.message}`);
            }
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

    /**
     * Fetches the board ID for a project.
     */
    private async getBoardId(config: JiraConfig): Promise<number | null> {
        try {
            const response = await axios.get(`${config.jira_url}/rest/agile/1.0/board`, {
                headers: {
                    'Authorization': `Basic ${config.access_token}`,
                    'Accept': 'application/json'
                },
                params: {
                    projectKeyOrId: config.jira_project_key
                },
                timeout: 10000
            });

            const boards = response.data.values || [];
            if (boards.length === 0) {
                console.error('No boards found for project:', config.jira_project_key);
                return null;
            }

            // Return the first board found for this project
            return boards[0].id;
        } catch (error) {
            console.error('Failed to fetch board ID:', error);
            return null;
        }
    }

    /**
     * Fetches all sprints for a team's board.
     */
    public async fetchSprints(teamId: string): Promise<JiraSprint[]> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        const boardId = await this.getBoardId(config);
        if (!boardId) {
            throw new Error('Unable to find board for this project');
        }

        try {
            const response = await axios.get(`${config.jira_url}/rest/agile/1.0/board/${boardId}/sprint`, {
                headers: {
                    'Authorization': `Basic ${config.access_token}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            return response.data.values || [];
        } catch (error: any) {
            console.error('Failed to fetch sprints:', error);
            throw new Error(`Failed to fetch sprints: ${error.message}`);
        }
    }

    /**
     * Fetches issues for a specific sprint.
     */
    public async fetchSprintIssues(teamId: string, sprintId: number): Promise<JiraIssue[]> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        const boardId = await this.getBoardId(config);
        if (!boardId) {
            throw new Error('Unable to find board for this project');
        }

        try {
            const response = await axios.get(
                `${config.jira_url}/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue`,
                {
                    headers: {
                        'Authorization': `Basic ${config.access_token}`,
                        'Accept': 'application/json'
                    },
                    params: {
                        fields: 'summary,status,assignee,updated,reporter,created,issuetype,priority,sprint'
                    },
                    timeout: 15000
                }
            );

            return response.data.issues || [];
        } catch (error: any) {
            console.error('Failed to fetch sprint issues:', error);
            throw new Error(`Failed to fetch sprint issues: ${error.message}`);
        }
    }

    /**
     * Fetches backlog issues (issues not assigned to any sprint).
     */
    public async fetchBacklogIssues(teamId: string): Promise<JiraIssue[]> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        const boardId = await this.getBoardId(config);
        if (!boardId) {
            throw new Error('Unable to find board for this project');
        }

        try {
            const response = await axios.get(
                `${config.jira_url}/rest/agile/1.0/board/${boardId}/backlog`,
                {
                    headers: {
                        'Authorization': `Basic ${config.access_token}`,
                        'Accept': 'application/json'
                    },
                    params: {
                        fields: 'summary,status,assignee,updated,reporter,created,issuetype,priority'
                    },
                    timeout: 15000
                }
            );

            return response.data.issues || [];
        } catch (error: any) {
            console.error('Failed to fetch backlog issues:', error);
            throw new Error(`Failed to fetch backlog issues: ${error.message}`);
        }
    }

    /**
     * Fetches available transitions for an issue.
     */
    public async fetchTransitions(teamId: string, issueKey: string): Promise<JiraTransition[]> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        try {
            const response = await axios.get(
                `${config.jira_url}/rest/api/3/issue/${issueKey}/transitions`,
                {
                    headers: {
                        'Authorization': `Basic ${config.access_token}`,
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return response.data.transitions || [];
        } catch (error: any) {
            console.error('Failed to fetch transitions:', error);
            throw new Error(`Failed to fetch transitions: ${error.message}`);
        }
    }

    /**
     * Transitions an issue to a new status.
     */
    public async transitionIssue(teamId: string, issueKey: string, transitionId: string): Promise<void> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        try {
            await axios.post(
                `${config.jira_url}/rest/api/3/issue/${issueKey}/transitions`,
                {
                    transition: {
                        id: transitionId
                    }
                },
                {
                    headers: {
                        'Authorization': `Basic ${config.access_token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            console.log(`Successfully transitioned issue ${issueKey} using transition ${transitionId}`);
        } catch (error: any) {
            console.error('Failed to transition issue:', error);
            throw new Error(`Failed to transition issue: ${error.message}`);
        }
    }

    /**
     * Creates a new issue in Jira.
     */
    public async createIssue(teamId: string, taskData: any): Promise<JiraIssue> {
        const config = await this.getJiraConfig(teamId);
        if (!config) {
            throw new Error('Jira not configured for this team');
        }

        try {
            // Build the issue payload according to Jira REST API v3 format
            const issuePayload: any = {
                fields: {
                    project: {
                        key: config.jira_project_key
                    },
                    summary: taskData.summary,
                    issuetype: {
                        name: taskData.issuetype || 'Task'
                    }
                }
            };

            // Add optional description if provided
            if (taskData.description) {
                // Jira Cloud uses Atlassian Document Format (ADF) for descriptions
                issuePayload.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: taskData.description
                                }
                            ]
                        }
                    ]
                };
            }

            // Add optional priority if provided
            if (taskData.priority) {
                issuePayload.fields.priority = {
                    name: taskData.priority
                };
            }

            console.log('Creating Jira issue with payload:', JSON.stringify(issuePayload, null, 2));

            // Create the issue
            const response = await axios.post(
                `${config.jira_url}/rest/api/3/issue`,
                issuePayload,
                {
                    headers: {
                        'Authorization': `Basic ${config.access_token}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            console.log('Issue created successfully:', response.data);

            // Fetch the full issue details to return
            const issueKey = response.data.key;
            const issueResponse = await axios.get(
                `${config.jira_url}/rest/api/3/issue/${issueKey}`,
                {
                    headers: {
                        'Authorization': `Basic ${config.access_token}`,
                        'Accept': 'application/json'
                    },
                    params: {
                        fields: 'summary,status,assignee,updated,reporter,created,issuetype,priority,description'
                    },
                    timeout: 10000
                }
            );

            return issueResponse.data;

        } catch (error: any) {
            console.error('Failed to create Jira issue:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });

            // Provide detailed error messages
            if (error.response?.status === 400) {
                const errorMessages = error.response.data?.errors || {};
                const errorKeys = Object.keys(errorMessages);
                if (errorKeys.length > 0) {
                    const firstError = errorMessages[errorKeys[0]];
                    throw new Error(`Validation error: ${firstError}`);
                }
                throw new Error('Invalid issue data. Please check your input and try again.');
            } else if (error.response?.status === 401) {
                throw new Error('Jira authentication failed. Please reconfigure the integration.');
            } else if (error.response?.status === 403) {
                throw new Error('Permission denied. You may not have permission to create issues in this project.');
            } else if (error.response?.status === 404) {
                throw new Error('Jira project not found. Please check the project configuration.');
            } else {
                throw new Error(`Failed to create issue: ${error.message}`);
            }
        }
    }
}
