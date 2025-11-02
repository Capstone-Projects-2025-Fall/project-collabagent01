import * as vscode from 'vscode';
import { createTeam, joinTeam, getUserTeams, deleteTeam as deleteTeamSvc, leaveTeam as leaveTeamSvc, type TeamWithMembership } from '../services/team-service';
import { validateCurrentProject, getCurrentProjectInfo, getProjectDescription } from '../services/project-detection-service';

/**
 * Provides the webview panel for Agent-specific features (separate from Live Share).
 * Shows Team & Product Management and the Agent chat box.
 */
export class AgentPanelProvider implements vscode.WebviewViewProvider {
    /** The unique identifier for this webview view type */
    public static readonly viewType = 'collabAgent.agentPanel';

    /** The webview view instance for displaying the panel */
    private _view?: vscode.WebviewView;

    /** Global state keys */
    private readonly _teamStateKey = 'collabAgent.currentTeam';
    
    /** Current teams cache */
    private _userTeams: TeamWithMembership[] = [];

    constructor(private readonly _extensionUri: vscode.Uri, private readonly _context: vscode.ExtensionContext) {
        // Monitor workspace changes - clear team when no folder open
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            // When workspace changes, refresh team info (will clear team if no folders open)
            setTimeout(() => {
                console.log('Workspace folders changed, updating team info...');
                this.postTeamInfo();
            }, 500); // Small delay to let workspace settle
        });
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Initialize with team info from database
        await this.refreshTeams();

        webviewView.webview.onDidReceiveMessage((message: any) => {
            console.log('AgentPanel received message:', message);
            switch (message.command) {
                case 'createTeam':
                    console.log('Handling createTeam command');
                    this.handleCreateTeam();
                    break;
                case 'joinTeam':
                    console.log('Handling joinTeam command');
                    this.handleJoinTeam();
                    break;
                case 'switchTeam':
                    console.log('Handling switchTeam command');
                    this.handleSwitchTeam();
                    break;
                case 'refreshTeams':
                    console.log('Handling refreshTeams command');
                    this.refreshTeams();
                    break;
                case 'aiQuery':
                    console.log('Handling aiQuery command');
                    this.handleAiQuery(message.text);
                    break;
                case 'deleteTeam':
                    console.log('Handling deleteTeam command');
                    this.handleDeleteTeam();
                    break;
                case 'leaveTeam':
                    console.log('Handling leaveTeam command');
                    this.handleLeaveTeam();
                    break;
                case 'addFileSnapshot':
                    console.log('Handling addFileSnapshot command');
                    this.addFileSnapshot(message.payload);
                    break;
                // generateSummary handler removed - edge function now handles automatic summarization
                case 'loadActivityFeed':
                    console.log('Handling loadActivityFeed command');
                    this.loadActivityFeed(message.teamId, message.limit);
                case 'publishSnapshot':
                    console.log('Handling publishSnapshot command');
                    vscode.commands.executeCommand('collabAgent.publishSnapshot');
                    break;
                default:
                    console.log('Unknown command received:', message.command);
                    break;
            }
        });
    }

    /**
     * Refreshes teams from database and updates UI
     */
    private async refreshTeams() {
        const result = await getUserTeams();
        if (result.error) {
            vscode.window.showWarningMessage(`Could not load teams: ${result.error}`);
            this._userTeams = [];
        } else {
            this._userTeams = result.teams || [];
        }
        this.postTeamInfo();
    }

    /**
     * Posts current team info to webview
     */
    private postTeamInfo() {
        const { getAuthContext } = require('../services/auth-service');
        let userId: string | null = null;
        try {
            const ctx = getAuthContext();
            // getAuthContext returns a Promise in services; but in constructor context we can't await
            // So we'll handle async separately below
        } catch {}

        // IMPORTANT: If no workspace folder is open, clear current team
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            // Clear the current team - user must open a project folder first
            this._context.globalState.update(this._teamStateKey, undefined);
            const teamInfo = { 
                name: null, 
                role: null, 
                joinCode: null, 
                id: null,
                projectValidation: null
            };
            
            this._view?.webview.postMessage({ 
                command: 'teamInfo', 
                teamInfo,
                teams: this._userTeams.map(t => ({
                    id: t.id,
                    name: t.lobby_name,
                    role: t.role,
                    joinCode: t.join_code
                }))
            });
            return;
        }

        // Get currently selected team from storage
        const currentTeamId = this._context.globalState.get<string>(this._teamStateKey);
        let currentTeam = this._userTeams.find(t => t.id === currentTeamId);
        
        // Don't auto-select a team - user must explicitly switch to a team
        // This prevents confusion when switching between projects

        // Validate current project if we have an active team
        let projectValidation = null;
        if (currentTeam) {
            const validation = this.validateTeamProject(currentTeam);
            projectValidation = {
                isMatch: validation.isMatch,
                message: validation.message,
                details: validation.details
            };
        }

        const teamInfo = currentTeam 
            ? { 
                name: currentTeam.lobby_name, 
                role: currentTeam.role === 'admin' ? 'Admin' : 'Member',
                joinCode: currentTeam.join_code,
                id: currentTeam.id,
                projectValidation: projectValidation
              }
            : { name: null, role: null, joinCode: null, id: null, projectValidation: null };

        (async () => {
            try {
                const { getAuthContext } = require('../services/auth-service');
                const res = await getAuthContext();
                userId = res?.context?.id || null;
            } catch {}
            this._view?.webview.postMessage({
                command: 'updateTeamInfo',
                team: teamInfo,
                userId,
                allTeams: this._userTeams.map(t => ({
                id: t.id,
                name: t.lobby_name,
                role: t.role === 'admin' ? 'Admin' : 'Member',
                joinCode: t.join_code
            }))
            });
        })();
    }

    // Public methods for MainPanel delegation
    public setWebviewForDelegation(view: vscode.WebviewView) {
        this._view = view;
    }

    public async createTeam() {
        return await this.handleCreateTeam();
    }

    public async joinTeam() {
        return await this.handleJoinTeam();
    }

    public async switchTeam() {
        return await this.handleSwitchTeam();
    }

    public async refreshTeamsList() {
        return await this.refreshTeams();
    }

    public async processAiQuery(text: string) {
        return this.handleAiQuery(text);
    }

    /**
     * Adds a file snapshot row via service and reports back to webview
     */
    public async addFileSnapshot(payload: any) {
        try {
            const { addFileSnapshot } = require('../services/file-snapshot-service');
            const result = await addFileSnapshot(payload);
            if (result.success) {
                this._view?.webview.postMessage({ command: 'fileSnapshotSaved', id: result.id });
            } else {
                this._view?.webview.postMessage({ command: 'fileSnapshotError', error: result.error || 'Failed to save snapshot' });
            }
        } catch (err) {
            this._view?.webview.postMessage({ command: 'fileSnapshotError', error: String(err) });
        }
    }

    // generateSummary method removed - edge function now handles automatic summarization

    /**
     * Loads recent activity for a team and posts back to webview.
     */
    public async loadActivityFeed(teamId?: string, limit = 25) {
        try {
            const effectiveTeamId = teamId || this._context.globalState.get<string>(this._teamStateKey);
            if (!effectiveTeamId) {
                this._view?.webview.postMessage({ command: 'activityError', error: 'No team selected.' });
                return;
            }
            const { fetchTeamActivity } = require('../services/team-activity-service');
            const res = await fetchTeamActivity(effectiveTeamId, limit);
            if (res.success) {
                this._view?.webview.postMessage({ command: 'activityFeed', items: res.items || [] });
            } else {
                this._view?.webview.postMessage({ command: 'activityError', error: res.error || 'Failed to load activity' });
            }
        } catch (err) {
            this._view?.webview.postMessage({ command: 'activityError', error: String(err) });
        }
    }

    /**
     * Handles team creation with database persistence
     */
    private async handleCreateTeam() {
        const name = await vscode.window.showInputBox({ 
            prompt: 'Enter new team name',
            placeHolder: 'My Team',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Team name cannot be empty';
                }
                if (value.trim().length > 50) {
                    return 'Team name must be 50 characters or less';
                }
                return null;
            }
        });
        
        if (!name?.trim()) return;

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating team...',
            cancellable: false
        }, async () => {
            const result = await createTeam(name.trim());
            
            if (result.error) {
                vscode.window.showErrorMessage(`Failed to create team: ${result.error}`);
            } else if (result.team && result.joinCode) {
                vscode.window.showInformationMessage(
                    `Created team "${result.team.lobby_name}" with join code: ${result.joinCode}`,
                    'Copy Join Code'
                ).then(action => {
                    if (action === 'Copy Join Code') {
                        vscode.env.clipboard.writeText(result.joinCode!);
                        vscode.window.showInformationMessage('Join code copied to clipboard');
                    }
                });
                
                // Refresh teams and set new team as current
                await this.refreshTeams();
                if (result.team) {
                    await this._context.globalState.update(this._teamStateKey, result.team.id);
                    this.postTeamInfo();
                }
            }
        });
    }

    /**
     * Handles joining a team by join code
     */
    private async handleJoinTeam() {
        const joinCode = await vscode.window.showInputBox({ 
            prompt: 'Enter 6-character team join code',
            placeHolder: 'ABC123',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Join code cannot be empty';
                }
                if (value.trim().length !== 6) {
                    return 'Join code must be exactly 6 characters';
                }
                if (!/^[A-Z0-9]+$/i.test(value.trim())) {
                    return 'Join code must contain only letters and numbers';
                }
                return null;
            }
        });
        
        if (!joinCode?.trim()) return;

        // First, validate project compatibility before joining
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Validating team...',
            cancellable: false
        }, async () => {
            // Get team info first without joining
            const teamLookupResult = await this.lookupTeamByJoinCode(joinCode.trim());
            
            if (teamLookupResult.error) {
                vscode.window.showErrorMessage(`Failed to find team: ${teamLookupResult.error}`);
                return;
            }
            
            if (!teamLookupResult.team) {
                vscode.window.showErrorMessage('Team not found with that join code');
                return;
            }

            // Validate project match BEFORE joining
            if (teamLookupResult.team.project_identifier) {
                const validation = this.validateTeamProjectForJoin(teamLookupResult.team);
                
                if (!validation.isMatch) {
                    const action = await vscode.window.showErrorMessage(
                        `Cannot join team "${teamLookupResult.team.lobby_name}"`,
                        {
                            modal: true,
                            detail: `${validation.message}\n\n${validation.details}\n\nYou must have the correct project folder open to join this team.`
                        },
                        'Open Correct Project',
                        'Cancel'
                    );
                    
                    if (action === 'Open Correct Project') {
                        this.showProjectGuidance(teamLookupResult.team as TeamWithMembership);
                    }
                    return; // Don't proceed with join
                }
            }

            // Project matches or team has no project requirement, proceed with join
            const result = await joinTeam(joinCode.trim());
            
            if (result.error) {
                vscode.window.showErrorMessage(`Failed to join team: ${result.error}`);
            } else if (result.team) {
                vscode.window.showInformationMessage(`Successfully joined team "${result.team.lobby_name}"`);
                
                // Refresh teams and set new team as current
                await this.refreshTeams();
                await this._context.globalState.update(this._teamStateKey, result.team.id);
                this.postTeamInfo();
            }
        });
    }

    /**
     * Handles switching between user's teams
     */
    private async handleSwitchTeam() {
        if (this._userTeams.length === 0) {
            vscode.window.showInformationMessage('You are not a member of any teams. Create or join a team first.');
            return;
        }

        if (this._userTeams.length === 1) {
            vscode.window.showInformationMessage('You only belong to one team.');
            return;
        }

        const teamOptions = this._userTeams.map(team => ({
            label: team.lobby_name,
            description: `${team.role === 'admin' ? 'Admin' : 'Member'} • Code: ${team.join_code}`,
            team: team
        }));

        const selected = await vscode.window.showQuickPick(teamOptions, {
            placeHolder: 'Select a team to switch to'
        });

        if (selected) {
            // Check if workspace folder is open
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                await vscode.window.showErrorMessage(
                    `Cannot switch to team "${selected.team.lobby_name}"`,
                    {
                        modal: true,
                        detail: 'You must open a project folder first.\n\nPlease open the Git repository folder for the team you want to switch to, then try again.'
                    },
                    'Open Folder',
                    'Cancel'
                ).then(action => {
                    if (action === 'Open Folder') {
                        vscode.commands.executeCommand('vscode.openFolder');
                    }
                });
                return;
            }

            // Debug: Log team data to see what's missing
            console.log('Team data for switch:', {
                name: selected.team.lobby_name,
                project_identifier: selected.team.project_identifier,
                project_repo_url: selected.team.project_repo_url,
                project_name: selected.team.project_name
            });

            // Validate that the current project matches the team's project
            const validation = this.validateTeamProject(selected.team);
            
            if (!validation.isMatch) {
                await vscode.window.showErrorMessage(
                    `Cannot switch to team "${selected.team.lobby_name}"`,
                    {
                        modal: true,
                        detail: validation.details
                    },
                    'Open Correct Project',
                    'Cancel'
                ).then(action => {
                    if (action === 'Open Correct Project') {
                        this.showProjectGuidance(selected.team);
                    }
                });
                return;
            }
            
            // Project matches - allow switch
            await this._context.globalState.update(this._teamStateKey, selected.team.id);
            vscode.window.showInformationMessage(`Successfully switched to team "${selected.team.lobby_name}"`);
            
            this.postTeamInfo();
        }
    }

    private handleAiQuery(text: string) {
        const reply = `Agent received: "${text}"`;
        this._view?.webview.postMessage({ command: 'aiResponse', text: reply });
    }

    /**
     * Gets the inner HTML content for embedding in the main panel
     */
    public getInnerHtml(): string {
        return `
            <div class="agent-heading">Agent</div>
            <div class="section">
                <div class="section-title">Team & Product Management</div>
                <div id="teamProduct">
                    <div><strong>Current Team:</strong> <span id="teamName">—</span></div>
                    <div><strong>Your Role:</strong> <span id="teamRole">—</span></div>
                    <div id="projectStatus" style="display:none; margin-top:4px;">
                        <div id="projectStatusIndicator" style="font-size:12px;"></div>
                    </div>
                    <div id="joinCodeSection" style="display:none;">
                        <strong>Join Code:</strong> 
                        <span id="teamJoinCode">—</span>
                        <button class="button" id="copyJoinCodeBtn" title="Copy join code">Copy</button>
                    </div>
                    <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="button" id="switchTeamBtn">Switch Team</button>
                        <button class="button" id="createTeamBtn">Create Team</button>
                        <button class="button" id="joinTeamBtn">Join Team</button>
                        <button class="button" id="refreshTeamsBtn" title="Refresh teams">Refresh</button>
                        <button class="button danger" id="deleteTeamBtn" style="display:none;">Delete Team</button>
                        <button class="button" id="leaveTeamBtn" style="display:none;">Leave Team</button>
                    </div>
                </div>
            </div>

            <div id="ai-agent-box" class="section">
                <h3>Add File Snapshot</h3>

                <!-- Metadata Section -->
                <div class="form-section">
                    <h4>Snapshot Metadata</h4>
                    <div class="readonly-grid">
                        <div class="form-row">
                            <label for="fs-id">Snapshot ID</label>
                            <input id="fs-id" type="text" readonly />
                        </div>
                        <div class="form-row">
                            <label for="fs-userId">User ID</label>
                            <input id="fs-userId" type="text" readonly />
                        </div>
                        <div class="form-row">
                            <label for="fs-teamId">Team ID</label>
                            <input id="fs-teamId" type="text" readonly />
                        </div>
                        <div class="form-row">
                            <label for="fs-updatedAt">Updated At</label>
                            <input id="fs-updatedAt" type="text" readonly />
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="button-small" id="fs-generateIdBtn" title="Generate a new UUID for snapshot">Regenerate ID</button>
                    </div>
                </div>

                <!-- Content Section -->
                <div class="form-section">
                    <h4>File Content</h4>
                    <div class="form-grid">
                        <div class="form-row">
                            <label for="fs-filePath">File Path</label>
                            <input id="fs-filePath" type="text" placeholder="e.g., src/app.ts" />
                        </div>
                        <div class="form-row">
                            <label for="fs-snapshot">Snapshot Content</label>
                            <textarea id="fs-snapshot" rows="6" placeholder="Paste snapshot content here..."></textarea>
                        </div>
                        <div class="form-row">
                            <label for="fs-changes">Changes Description</label>
                            <textarea id="fs-changes" rows="4" placeholder="Describe changes or paste diff..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="button" id="fs-addBtn">Add Snapshot</button>
                        </div>
                        <div id="fs-feedback" class="feedback-text"></div>
                    </div>
                </div>

                <!-- AI Summary Section removed - edge function now handles automatic summarization -->
                <!-- Anchor element for Activity Feed (dynamically inserted by JS) -->
                <div id="fs-summary-feedback" class="feedback-text" style="display:none;"></div>
            </div>
        `;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'agentPanel.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'panel.css'));
        const nonce = Date.now().toString();
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Agent Panel</title>
            <link href="${styleUri}" rel="stylesheet" />
        </head>
        <body>
            <div class="agent-heading">Agent</div>
            <div class="section">
                <div class="section-title">Team & Product Management</div>
                <div id="teamProduct">
                    <div><strong>Current Team:</strong> <span id="teamName">—</span></div>
                    <div><strong>Your Role:</strong> <span id="teamRole">—</span></div>
                    <div id="joinCodeSection" style="display:none;">
                        <strong>Join Code:</strong> 
                        <span id="teamJoinCode">—</span>
                        <button class="button" id="copyJoinCodeBtn" title="Copy join code">Copy</button>
                    </div>
                    <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="button" id="switchTeamBtn">Switch Team</button>
                        <button class="button" id="createTeamBtn">Create Team</button>
                        <button class="button" id="joinTeamBtn">Join Team</button>
                        <button class="button" id="refreshTeamsBtn" title="Refresh teams">Refresh</button>
                        <button class="button danger" id="deleteTeamBtn" style="display:none;">Delete Team</button>
                        <button class="button" id="leaveTeamBtn" style="display:none;">Leave Team</button>
                    </div>
                </div>
            </div>

            <div id="ai-agent-box" class="section">
                <h3>Add File Snapshot</h3>

                <!-- Metadata Section -->
                <div class="form-section">
                    <h4>Snapshot Metadata</h4>
                    <div class="readonly-grid">
                        <div class="form-row">
                            <label for="fs-id">Snapshot ID</label>
                            <input id="fs-id" type="text" readonly />
                        </div>
                        <div class="form-row">
                            <label for="fs-userId">User ID</label>
                            <input id="fs-userId" type="text" readonly />
                        </div>
                        <div class="form-row">
                            <label for="fs-teamId">Team ID</label>
                            <input id="fs-teamId" type="text" readonly />
                        </div>
                        <div class="form-row">
                            <label for="fs-updatedAt">Updated At</label>
                            <input id="fs-updatedAt" type="text" readonly />
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="button-small" id="fs-generateIdBtn" title="Generate a new UUID for snapshot">Regenerate ID</button>
                    </div>
                </div>

                <!-- Content Section -->
                <div class="form-section">
                    <h4>File Content</h4>
                    <div class="form-grid">
                        <div class="form-row">
                            <label for="fs-filePath">File Path</label>
                            <input id="fs-filePath" type="text" placeholder="e.g., src/app.ts" />
                        </div>
                        <div class="form-row">
                            <label for="fs-snapshot">Snapshot Content</label>
                            <textarea id="fs-snapshot" rows="6" placeholder="Paste snapshot content here..."></textarea>
                        </div>
                        <div class="form-row">
                            <label for="fs-changes">Changes Description</label>
                            <textarea id="fs-changes" rows="4" placeholder="Describe changes or paste diff..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button class="button" id="fs-addBtn">Add Snapshot</button>
                        </div>
                        <div id="fs-feedback" class="feedback-text"></div>
                    </div>
                </div>

                <!-- AI Summary Section removed - edge function now handles automatic summarization -->
                <!-- Anchor element for Activity Feed (dynamically inserted by JS) -->
                <div id="fs-summary-feedback" class="feedback-text" style="display:none;"></div>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    /**
     * STRICT validation for team switching - no exceptions allowed
     */
    private validateTeamProjectForSwitch(team: TeamWithMembership): {
        isMatch: boolean;
        message: string;
        details: string;
    } {
        // Check 1: No workspace folder open
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return {
                isMatch: false,
                message: `No project folder open`,
                details: `To switch to team "${team.lobby_name}", you must first open the team's Git repository folder in VS Code.\n\nRequired: ${team.project_repo_url || team.project_name || 'Team project'}\n\nPlease:\n1. Open the correct project folder\n2. Try switching teams again`
            };
        }

        // Check 2: All teams require Git projects
        if (!team.project_identifier || !team.project_repo_url) {
            return {
                isMatch: false,
                message: `Team "${team.lobby_name}" requires Git repository`,
                details: 'This team was created before Git requirements were enforced.\n\nAll teams must be linked to Git repositories.\nContact the team admin to recreate the team with a Git repository.'
            };
        }

        // Check 3: Current folder must be Git-initialized
        const currentProject = getCurrentProjectInfo();
        if (!currentProject || !currentProject.isGitRepo) {
            const folderName = currentProject?.projectName || 'Non-Git folder';
            return {
                isMatch: false,
                message: `Current folder is not a Git repository`,
                details: `Team "${team.lobby_name}" requires a Git repository, but your current folder is not Git-initialized.\n\nRequired: ${team.project_repo_url}\nCurrent: ${folderName}\n\nPlease:\n1. Close this folder\n2. Open the team's Git repository\n3. Try switching again`
            };
        }

        // Check 4: Git repository hash must match exactly
        const validation = validateCurrentProject(team.project_identifier, team.project_repo_url);
        
        if (validation.isMatch) {
            return {
                isMatch: true,
                message: `Project matches team "${team.lobby_name}"`,
                details: `Current project: ${getProjectDescription(currentProject)}\nTeam project: ${team.project_repo_url}`
            };
        }

        // Check 5: Project hash mismatch - wrong Git repository
        const currentDesc = getProjectDescription(currentProject);
        const teamDesc = team.project_repo_url || team.project_name || 'Unknown project';

        return {
            isMatch: false,
            message: `Wrong Git repository open`,
            details: `Team "${team.lobby_name}" requires a specific Git repository, but you have a different one open.\n\nCurrent: ${currentDesc}\nRequired: ${teamDesc}\n\nReason: ${validation.reason || 'Git repository fingerprints do not match'}\n\nPlease:\n1. Clone the correct repository: git clone ${team.project_repo_url}\n2. Open the cloned folder in VS Code\n3. Try switching teams again`
        };
    }

    /**
     * Validates if the current workspace project matches the team's project
     */
    private validateTeamProject(team: TeamWithMembership): {
        isMatch: boolean;
        message: string;
        details: string;
    } {
        // All teams now require Git projects - no project info means old team
        if (!team.project_identifier || !team.project_repo_url) {
            return {
                isMatch: false,
                message: `Team "${team.lobby_name}" requires Git repository`,
                details: 'This team was created before Git requirements were enforced. Contact the team admin to recreate the team with a Git repository.'
            };
        }

        const validation = validateCurrentProject(team.project_identifier, team.project_repo_url);
        
        if (validation.isMatch) {
            return {
                isMatch: true,
                message: `Project matches team "${team.lobby_name}"`,
                details: validation.currentProject ? 
                    `Current project: ${getProjectDescription(validation.currentProject)}` : 
                    'Project validation successful'
            };
        }

        // Project mismatch
        const currentDesc = validation.currentProject ? 
            getProjectDescription(validation.currentProject) : 
            'No workspace open';
        
        const teamDesc = team.project_repo_url || team.project_name || 'Unknown project';

        return {
            isMatch: false,
            message: `Wrong Git repository open for team "${team.lobby_name}"`,
            details: `Current: ${currentDesc}\nRequired: ${teamDesc}\n\n${validation.reason || 'Git repositories do not match'}\n\nPlease clone the correct repository and open it in VS Code.`
        };
    }

    /**
     * Shows guidance on how to open the correct project for the team
     */
    private showProjectGuidance(team: TeamWithMembership) {
        const teamRepoUrl = team.project_repo_url || 'the team repository';
        
        vscode.window.showInformationMessage(
            `To collaborate with team "${team.lobby_name}", you must have the correct Git repository cloned locally.`,
            {
                modal: true,
                detail: `Team Repository: ${teamRepoUrl}\n\nRequired Steps:\n1. Clone the repository: git clone ${teamRepoUrl}\n2. Open the cloned folder in VS Code\n3. Switch back to this team\n\nTeam functionality only works with Git repositories.\nAll members must have the same repository cloned locally.`
            },
            'Open Folder',
            'Copy Git URL',
            'Got It'
        ).then(action => {
            if (action === 'Open Folder') {
                vscode.commands.executeCommand('vscode.openFolder');
            } else if (action === 'Copy Git URL' && team.project_repo_url) {
                vscode.env.clipboard.writeText(team.project_repo_url);
                vscode.window.showInformationMessage('Git repository URL copied to clipboard');
            }
        });
    }

    /**
     * Looks up a team by join code without joining it (for validation)
     */
    private async lookupTeamByJoinCode(joinCode: string): Promise<{ team?: any; error?: string }> {
        try {
            const { getSupabase } = require('../auth/supabaseClient');
            const supabase = await getSupabase();

            console.log('Looking up team with join code via RPC:', joinCode.toUpperCase());

            // Use secure RPC that bypasses RLS safely (SECURITY DEFINER)
            const { data: teamData, error: teamError } = await supabase
                .rpc('get_team_by_join_code', { p_join_code: joinCode.toUpperCase() })
                .maybeSingle();

            console.log('Team lookup result (rpc):', { teamData, teamError, searchCode: joinCode.toUpperCase() });
            if (teamError || !teamData) {
                return { error: `Invalid join code or team not found. Error: ${teamError?.message || 'No team found'}` };
            }

            return { team: teamData };
        } catch (error) {
            return { error: `Team lookup failed: ${error}` };
        }
    }

    /**
     * Validates project for join operation (stricter than switch validation)
     */
    private validateTeamProjectForJoin(team: any): {
        isMatch: boolean;
        message: string;
        details: string;
    } {
        // If team has no project information, allow join
        if (!team.project_identifier) {
            return {
                isMatch: true,
                message: 'Team has no specific project requirements',
                details: 'This team is not linked to a specific project.'
            };
        }

        const validation = validateCurrentProject(team.project_identifier, team.project_repo_url);
        
        if (validation.isMatch) {
            return {
                isMatch: true,
                message: `Project matches team "${team.lobby_name}"`,
                details: validation.currentProject ? 
                    `Current project: ${getProjectDescription(validation.currentProject)}` : 
                    'Project validation successful'
            };
        }

        // Strict validation for join - require exact match
        const currentDesc = validation.currentProject ? 
            getProjectDescription(validation.currentProject) : 
            'No workspace open';
        
        const teamDesc = team.project_repo_url || team.project_name || 'Unknown project';

        return {
            isMatch: false,
            message: `Project mismatch detected`,
            details: `Current: ${currentDesc}\nRequired: ${teamDesc}\n\nReason: ${validation.reason || 'Project fingerprints do not match'}`
        };
    }

    /**
     * Delete current team (admin only) with confirmation
     */
    private async handleDeleteTeam() {
        // Determine current team from global state
        const currentTeamId = this._context.globalState.get<string>(this._teamStateKey);
        if (!currentTeamId) {
            vscode.window.showInformationMessage('No active team selected.');
            return;
        }

        const currentTeam = this._userTeams.find(t => t.id === currentTeamId);
        if (!currentTeam) {
            vscode.window.showErrorMessage('Current team not found. Please refresh teams.');
            return;
        }
        if (currentTeam.role !== 'admin') {
            vscode.window.showErrorMessage('Only the Team Admin can delete this team.');
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete team "${currentTeam.lobby_name}"?`,
            {
                modal: true,
                detail: 'This will permanently remove the team and all memberships. This action cannot be undone.'
            },
            'Yes, Delete',
            'Cancel'
        );
        if (confirm !== 'Yes, Delete') return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Deleting team "${currentTeam.lobby_name}"...`,
            cancellable: false
        }, async () => {
            const res = await deleteTeamSvc(currentTeamId);
            if (!res.success) {
                vscode.window.showErrorMessage(res.error || 'Failed to delete team');
                return;
            }
            // Clear current selection and refresh
            await this._context.globalState.update(this._teamStateKey, undefined);
            await this.refreshTeams();
            vscode.window.showInformationMessage(`Team "${currentTeam.lobby_name}" was deleted.`);
        });
    }

    /**
     * Leave current team (member only) with confirmation
     */
    private async handleLeaveTeam() {
        const currentTeamId = this._context.globalState.get<string>(this._teamStateKey);
        if (!currentTeamId) {
            vscode.window.showInformationMessage('No active team selected.');
            return;
        }

        const currentTeam = this._userTeams.find(t => t.id === currentTeamId);
        if (!currentTeam) {
            vscode.window.showErrorMessage('Current team not found. Please refresh teams.');
            return;
        }
        if (currentTeam.role === 'admin') {
            vscode.window.showErrorMessage('Admins cannot leave their own team. You can delete the team instead.');
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Leave team "${currentTeam.lobby_name}"?`,
            {
                modal: true,
                detail: 'You will be removed from this team and lose access to it. You can rejoin later with a valid join code.'
            },
            'Yes, Leave',
            'Cancel'
        );
        if (confirm !== 'Yes, Leave') return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Leaving team "${currentTeam.lobby_name}"...`,
            cancellable: false
        }, async () => {
            const res = await leaveTeamSvc(currentTeamId);
            if (!res.success) {
                vscode.window.showErrorMessage(res.error || 'Failed to leave team');
                return;
            }
            await this._context.globalState.update(this._teamStateKey, undefined);
            await this.refreshTeams();
            vscode.window.showInformationMessage(`You have left team "${currentTeam.lobby_name}".`);
        });
    }
}
