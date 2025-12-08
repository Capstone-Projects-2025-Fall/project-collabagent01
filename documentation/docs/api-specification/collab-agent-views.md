---
sidebar_position: 3
description: TypeDoc documentation for Collab Agent Views
---

Collab Agent Views
==================

## Agent Panel (AgentPanel.ts)

### postTeamInfo Function
Defined in **views/AgentPanel.ts:202**

Posts current team information and member list to the webview.

**Returns:** `void`

**Remarks:**
* **Purpose:** Gathers current team data, validates workspace project match, fetches team members, and sends all information to the webview for display
* **Team Clearing:** If no workspace folders open, clears current team selection to prevent team operations without project context
* **Snapshot Auto-Trigger:** Checks if team is loaded, user authenticated, project matches; calls `takeInitialSnapshot()` if no baseline exists

### broadcastSnapshot Function
Defined in **views/AgentPanel.ts:397**

Broadcasts a manual snapshot of current workspace changes to the team.

**Returns:** `Promise<void>`

**Remarks:**
* **Purpose:** Allows users to manually broadcast their current code changes, bypassing automatic snapshot constraints like minimum line changes and cooldown period
* **Validation:** User must be signed in, team must be selected, snapshot manager must be initialized
* **Manual vs Automatic:** Bypasses minimum line change requirement and cooldown period, but still requires initial snapshot to exist

**Example:**
```typescript
const agentPanel = new AgentPanelProvider(extensionUri, context);
await agentPanel.broadcastSnapshot();
// Snapshot broadcasted to team, activity feed refreshed
```

### loadActivityFeed Function
Defined in **views/AgentPanel.ts:476**

Loads recent activity feed for a team and sends it to the webview.

**Parameters:**
- `teamId?: string` - Optional team ID to load activity for (defaults to current team)
- `limit?: number` - Maximum number of activity items to fetch (default: 25)

**Returns:** `Promise<void>`

**Remarks:**
* **Activity Types:** Code snapshots from team members, AI task assignment recommendations, other team collaboration events
* **Data Flow:** Uses current team if no teamId provided, calls `fetchTeamActivity()` from team-activity-service, sends `activityFeed` message to webview on success

**Example:**
```typescript
// Load default 25 recent items for current team
await agentPanel.loadActivityFeed();

// Load 50 items for specific team
await agentPanel.loadActivityFeed("team-123", 50);
```

### handleCreateTeam Function
Defined in **views/AgentPanel.ts:528**

Handles team creation workflow with input validation and database persistence.

**Returns:** `Promise<void>`

**Remarks:**
* **Validation Rules:** Name cannot be empty or whitespace only, name must be 50 characters or less
* **Post-Creation:** Team automatically becomes current selection, join code displayed with copy option, UI updated to reflect new team
* **Workflow:** Shows input box with validation → Creates team via `createTeam()` service → Shows progress notification → Displays join code with option to copy to clipboard → Refreshes teams list and selects new team

**Example:**
```typescript
// User clicks "Create Team" button
await this.handleCreateTeam();
// Prompts appear, team created, join code shown
```

### handleJoinTeam Function
Defined in **views/AgentPanel.ts:612**

Handles team join workflow with project validation and join code verification.

**Returns:** `Promise<void>`

**Remarks:**
* **Validation Rules:** Join code must be exactly 6 characters, must contain only letters and numbers, team must exist in database, current workspace must match team's Git repository
* **Project Validation:** Checked BEFORE actually joining the team, prevents joining wrong team for current project, shows detailed error with correct repository info
* **Workflow:** Shows input box with join code validation → Looks up team via `lookupTeamByJoinCode()` → Validates current project matches team's project → Joins team via `joinTeam()` service if validation passes

**Example:**
```typescript
// User clicks "Join Team" button
await this.handleJoinTeam();
// Prompts for join code, validates, joins if matches
```

### handleSwitchTeam Function
Defined in **views/AgentPanel.ts:731**

Handles team switching workflow with project validation.

**Returns:** `Promise<void>`

**Remarks:**
* **Validation:** Workspace folder must be open, current project must match team's Git repository exactly, Git fingerprints must match (prevents wrong repo)
* **Single Team Users:** Still shows picker to explicitly activate snapshot tracking; selecting same team again activates it with confirmation message
* **Workflow:** Shows team picker for user to select from their teams → Validates workspace folder is open → Validates current project matches team's Git repository → Updates current team in global state → Calls `takeInitialSnapshot()` to enable tracking

**Example:**
```typescript
// User clicks "Switch Team" button
await this.handleSwitchTeam();
// Shows team picker, validates project, switches if valid
```

### takeInitialSnapshot Function
Defined in **views/AgentPanel.ts:853**

Takes initial baseline snapshot when team is selected or switched.

**Parameters:**
- `teamId: string` - The team ID to associate the snapshot with

**Returns:** `Promise<void>`

**Remarks:**
* **Baseline Snapshot:** First snapshot taken when team is selected, establishes reference point for future automatic snapshots, required for automatic snapshot tracking to work
* **When Called:** Team is switched via `handleSwitchTeam()`, team auto-selected in `postTeamInfo()` if no baseline exists
* **Process:** Gets current authenticated user → Extracts project name from workspace folders → Calls `snapshotManager.takeSnapshot()` to create baseline

**Example:**
```typescript
// After user switches to a team
await this.takeInitialSnapshot("team-123");
// Baseline snapshot captured, automatic tracking enabled
```

### handleDeleteTeam Function
Defined in **views/AgentPanel.ts:1201**

Handles team deletion workflow with admin verification and confirmation.

**Returns:** `Promise<void>`

**Remarks:**
* **Admin Only:** Only team creators/admins can delete teams; members see error if they attempt deletion
* **Confirmation:** Modal dialog with warning message, clearly states action is permanent and irreversible, user must click "Yes, Delete" to proceed
* **Post-Deletion:** Team removed from database, all memberships removed, current team selection cleared, UI updated to reflect deletion

**Example:**
```typescript
// User clicks "Delete Team" button
await this.handleDeleteTeam();
// Prompts for confirmation, deletes if admin confirms
```

### handleLeaveTeam Function
Defined in **views/AgentPanel.ts:1290**

Handles team leave workflow with member verification and confirmation.

**Returns:** `Promise<void>`

**Remarks:**
* **Member Only:** Only team members can leave teams; admins see error directing them to delete team instead; prevents admins from abandoning their teams
* **Confirmation:** Modal dialog with warning message, states user will lose access to team, notes user can rejoin later with join code
* **Post-Leave:** User's membership removed from database, user removed from team members list, current team selection cleared, UI updated to reflect team removal

**Example:**
```typescript
// Member clicks "Leave Team" button
await this.handleLeaveTeam();
// Prompts for confirmation, removes membership if confirmed
```

***

## Live Share Panel (LiveSharePanel.ts)

### LiveShareManager Class
Defined in **views/LiveSharePanel.ts:47**

Provides Live Share functionality for the Collab Agent extension.

**Remarks:**
* **Key Features:** Dual Participant Tracking (uses both Live Share API events and Supabase real-time updates); Session Baseline (captures workspace state at session start for diff comparison); Activity Integration (automatically logs session events to team activity feed); Snapshot Management (pauses automatic snapshots during collaboration, resumes after)
* **Session Flow:** Host starts session → creates baseline snapshot → pauses automatic tracking; Participants announce presence via Supabase; Session activity is tracked in activity feed with invite links; Session ends → captures session changes → creates summary → resumes tracking
* **Important Notes:** Only hosts can end sessions (guests can only leave); Session changes are only captured for hosts (guests don't save snapshots); Closing workspace folder ends the session for all participants

### loadParticipantsFromSupabase Function
Defined in **views/LiveSharePanel.ts:466**

Loads all session participants from Supabase and updates the webview UI.

**Parameters:**
- `sessionId: string` - The Live Share session ID to query participants for

**Remarks:**
* **Data Flow:** Queries session_participants table via SessionSyncService → Converts Supabase format to UI format (name, email, role) → Sends `updateParticipants` message to webview → Updates session status with correct participant count
* **Role Assignment:** Peer number 1 → Host; Peer number >1 → Guest
* **UI Updates:** Participant list with names and roles, total participant count, session status (hosting/joined) with updated count

### insertLiveShareSessionEndEvent Function
Defined in **views/LiveSharePanel.ts:706**

Inserts a "Live Share Session Ended" event with participant details and session summary into the activity feed.

**Returns:** `Promise<void>`

**Remarks:**
* **Critical Workflow:** Validates session tracking data → Calculates session duration in minutes → **Hosts Only:** Captures session changes using SnapshotManager diff → Creates live_share_ended event in activity feed → Creates file snapshot with session changes → Edge function automatically updates the event with AI-generated summary
* **Session Changes Capture:** **Hosts** use SnapshotManager.captureSessionChanges() to get diff between baseline and current state; **Guests** do not save session snapshots (marked as "(guest - no session snapshot)")
* **Activity Feed Integration:** Event type: `live_share_ended`; includes: user, display name, session ID, duration, baseline snapshot ID; AI summary added automatically by edge function after snapshot creation

### pauseAutomaticSnapshotting Function
Defined in **views/LiveSharePanel.ts:1810**

Pauses automatic snapshot tracking when a Live Share session starts.

**Parameters:**
- `isHost: boolean` - Whether the current user is the session host
- `sessionId?: string` - The Live Share session ID

**Returns:** `Promise<string | null>` - Returns the baseline snapshot ID if host, null otherwise

**Remarks:**
* **Critical Workflow for Hosts:** Create session baseline FIRST (captures current state with pending changes) → Save pending changes as automatic snapshot (for AI summary in activity feed) → Pause automatic tracking
* **Purpose:** Saves any pending local changes before pausing; if host, also creates a session baseline snapshot

### resumeAutomaticSnapshotting Function
Defined in **views/LiveSharePanel.ts:1856**

Resumes automatic snapshot tracking after a Live Share session ends.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Gets current user and team → Calls `snapshotManager.resumeAutomaticTracking()` which also takes a new baseline snapshot → Logs success/failure for debugging
* **Purpose:** Takes a new initial snapshot to set a fresh baseline for post-session tracking

***

## Main Panel (MainPanel.ts) 

### CollabAgentPanelProvider Class
Defined in **views/MainPanel.ts:18**

Main orchestrator panel that manages and displays five sub-panels.

**Remarks:**
* **Sub-Panels:** Home Screen (authentication, welcome, user info), Live Share (collaboration sessions, team messaging), Agent Panel (team management, AI chat bot), Tasks Panel (Jira task integration), Profile (user profile and preferences)

### resolveWebviewView Function
Defined in **views/MainPanel.ts:67**

Resolves the webview view when it becomes visible.

**Parameters:**
- `webviewView: vscode.WebviewView` - The webview view to resolve
- `context: vscode.WebviewViewResolveContext` - The resolution context
- `_token: vscode.CancellationToken` - Cancellation token (unused)

**Returns:** `Promise<void>`

**Remarks:**
* **Setup Process:** Sets up the webview HTML, message handlers, and initializes Live Share; sets up sub-panels with the webview for delegation; delegates commands to appropriate sub-panels (Live Share, Agent, Tasks, Profile)

  ### _getHtmlForWebview Function
Defined in **views/MainPanel.ts:1085**

Generates the complete HTML content for the webview panel by combining templates and sub-panel content.

**Parameters:**
- `webview: vscode.Webview` - The webview instance for generating resource URIs and CSP nonces

**Returns:** `Promise<string>` - The complete HTML string for the panel

**Remarks:**
* **HTML Generation Process:** Checks Live Share extension installation status → Retrieves current authentication state and user info → Gathers HTML content from all sub-panels → Loads main panel template from media/mainPanel.html → Replaces template placeholders with style/script URIs, CSP nonce, authentication flags, and sub-panel HTML content
* **Resource URIs:** All static resources (CSS, JS) are converted to webview URIs using asWebviewUri() for proper Content Security Policy compliance

***

## Tasks Panel (TasksPanel.ts)
### TasksPanel Class
Defined in **views/TasksPanel.ts:10**

Tasks panel for displaying Jira issues/tasks for teams.

**Remarks:**
* **Purpose:** Admin users can configure Jira integration, all team members can view tasks
* **Rate Limiting:** AI Suggestions feature has 5-minute cooldown per team to manage API costs; maximum 25 tasks analyzed per AI request

### refreshTeamState Function
Defined in **views/TasksPanel.ts:114**

Refreshes the current team and user state from global storage.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Gets the current team ID from VS Code global state → Fetches user teams to determine the current user's role in the selected team → Checks if Jira is configured for the team via JiraService → Updates internal state flags
* **Error Handling:** On error, resets all state to null/false to prevent inconsistent UI states

**Example:**
```typescript
await this.refreshTeamState();
this.updateUI(); // Update UI based on new state
```

### loadTasks Function
Defined in **views/TasksPanel.ts:252**

Loads and displays Jira tasks/issues for the current team.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Requires a valid `_currentTeamId` and `_view` to be set → Calls `JiraService.fetchTeamIssues()` to retrieve all issues for the team → Posts a message to the webview with tasks and admin status → Shows loading/error states in the UI
* **Error Handling:** On error, displays an error message in the UI and logs to console

**Example:**
```typescript
// Refresh tasks after a state change
await this.loadTasks();
```

### handleConnectJira Function
Defined in **views/TasksPanel.ts:311**

Initiates Jira OAuth connection flow for team administrators.

**Returns:** `Promise<void>`

**Remarks:**
* **Security:** Only works for team administrators (`_currentUserRole === 'admin'`); enforces admin-only access (returns early for non-admins); requires valid team ID and authenticated user
* **Process:** Retrieves the current user's authentication context → Calls `JiraService.initiateJiraAuth()` to start OAuth flow → Refreshes team state and updates UI after successful connection

**Example:**
```typescript
// Called when admin clicks "Connect to Jira" button
await tasksPanel.handleConnectJira();
```

### handleDisconnectJira Function
Defined in **views/TasksPanel.ts:448**

Disconnects the team from Jira and removes the integration configuration.

**Returns:** `Promise<void>`

**Remarks:**
* **Security:** Only works for team administrators; requires user confirmation via modal dialog; completely removes all stored Jira credentials
* **Process:** Shows a modal confirmation dialog before disconnecting → Calls `JiraService.disconnectJira()` to remove credentials and config → Refreshes team state to show setup UI again

**Example:**
```typescript
// Called when admin clicks "Disconnect from Jira" button
await tasksPanel.handleDisconnectJira();
```
### handleCreateTask Function
Defined in **views/TasksPanel.ts:805**

Creates a new Jira issue/task for the current team.

**Parameters:**
- `taskData: any` - The task creation data object containing fields like summary, description, issue type, etc.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Validates that a team is selected and view is available → Calls `JiraService.createIssue()` to create the issue in Jira → Shows success notification with the created issue key → Posts 'taskCreated' message to webview on success → Refreshes the task list to include the new task

**Example:**
```typescript
await tasksPanel.handleCreateTask({
  summary: "Implement user authentication",
  description: "Add JWT-based authentication",
  issuetype: { name: "Story" },
  priority: { name: "High" }
});
```

### handleGetAISuggestions Function
Defined in **views/TasksPanel.ts:879**

Generates AI-powered task assignment recommendations for unassigned Jira issues.

**Returns:** `Promise<void>`

**Remarks:**
* **Rate Limiting:** Cooldown period: 5 minutes (`AI_COOLDOWN_MS`); max tasks analyzed: 25 tasks (`MAX_TASKS_TO_ANALYZE`); tracked per team ID in `_lastAISuggestionTime` map
* **API Call:** Endpoint: POST /api/ai/task_recommendations; payload: { team_id, user_id, unassigned_tasks: [{key, summary, description}] }; response: { recommendations_count }
* **Process:** Fetches all team issues and filters for unassigned tasks → Enforces rate limiting and task limit → Sends task data to AI recommendations API endpoint → Posts recommendations to team activity timeline via backend

**Example:**
```typescript
// Called when user clicks "Get AI Suggestions" button
await tasksPanel.handleGetAISuggestions();
// AI analyzes unassigned tasks and posts recommendations to timeline
```
