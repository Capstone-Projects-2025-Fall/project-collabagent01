---
sidebar_position: 2
description: Auto-generated TypeDoc for Collab Agent Services
---

Collab Agent Services
=====================

## Auth Service

### setAuthContext Function
Defined in **services/auth-service.ts:16**

Stores the current user's authentication context in VS Code's global state for persistence across sessions.

**Parameters:**
- `user: User | undefined` - The authenticated user object or undefined to clear auth context

**Returns:** `Promise<{ error?: string }>`
- Empty object on success, or object with error message

**Pre-conditions:**
- globalContext must be initialized

**Post-conditions:**
- User context is saved to global state and persists across VS Code sessions

### getAuthContext Function
Defined in **services/auth-service.ts:34**

Retrieves the currently authenticated user from VS Code's global state.

**Returns:** `Promise<{ context?: User; error?: string }>`
- Object containing user context or error message

### checkUserSignIn Function
Defined in **services/auth-service.ts:50**

Validates user session on extension startup. Refreshes user data from Supabase and displays welcome notification if authenticated.

**Returns:** `Promise<void>`

**Post-conditions:**
- User data is refreshed from backend
- Welcome notification shown if user is authenticated
- Auth notification shown if user is not signed in

### signInWithGithub Function
Defined in **services/auth-service.ts:333**

Initiates GitHub OAuth sign-in flow using Supabase authentication. Opens external browser for GitHub authorization.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Generates dynamic deep link callback URL based on extension ID, creates Supabase OAuth URL with GitHub provider, opens authorization URL in user's default browser
* **Post-conditions:** User is redirected to GitHub OAuth consent screen; on success, auth callback triggers user session creation

**Example:**
```typescript
await signInWithGithub();
// User is redirected to GitHub OAuth consent page
// After authorization, callback handler completes sign-in
```

### handleSignIn Function
Defined in **services/auth-service.ts:148**

Handles email/password sign-in flow with interactive VS Code input prompts.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Prompts user for email and password, calls authentication API, stores Supabase session for persistence, fetches and stores user profile data
* **Post-conditions:** User is authenticated and session is stored; auth context is set with user data; `collabAgent.authStateChanged` command is triggered

### handleSignOut Function
Defined in **services/auth-service.ts:251**

Signs out the current user, clearing all stored authentication data and tokens.

**Returns:** `Promise<void>`

**Remarks:**
* **Process:** Validates user is currently authenticated, clears auth context from global state, clears GitHub access token if present
* **Post-conditions:** User context is removed from global state; GitHub token is cleared; sign out notification displayed; UI refreshes to unauthenticated state

### getCurrentUserId Function
Defined in **services/auth-service.ts:367**

Gets the current Supabase auth user ID from the active session.

**Returns:** `Promise<string | null>`
- Supabase user ID or null if no active session

**Remarks:**
* Attempts to get session user ID, falls back to explicit user fetch if session not found

***

## Profile Service

### getUserProfile Function
Defined in **services/profile-service.ts**

Retrieves user profile information for display in team views.

**Parameters:**
- `userId: string` - Supabase auth user ID

**Returns:** `Promise<{ profile?: UserProfile; error?: string }>`
- User profile data


### updateUserProfile Function
Defined in **services/profile-service.ts**

Updates user profile fields like display name, interests, and skills.

**Parameters:**
- `userId: string` - Supabase auth user ID
- `updates: Partial<UserProfile>` - Fields to update

**Returns:** `Promise<{ success: boolean; error?: string }>`
- Update status
  
***

## Team Service

### createTeam Function
Defined in **services/team-service.ts:176**

Creates a new team with authenticated user as admin, linking it to the current Git project.

**Parameters:**
- `lobbyName: string` - Display name for the team lobby

**Returns:** `Promise<{ team?: Team; joinCode?: string; error?: string }>`
- `team`: The created Team object with all metadata
- `joinCode`: The generated 6-character join code for inviting members
- `error`: Error message if creation failed

**Pre-conditions:**
- User must be authenticated via Supabase
- A Git repository with remote origin must be initialized in the workspace
- User must have permissions to create teams in the database

**Post-conditions:**
- Team is created in Supabase `teams` table
- User is automatically added to `team_membership` table as admin
- Project information (Git URL, hash, name) is stored with the team
- If GitHub repository, verification status is recorded
- Unique 6-character join code is generated and returned

**Remarks:**
* **GitHub Verification:** If the remote URL is a GitHub repository, the function attempts silent verification by checking if user has stored GitHub access token and verifying user has push access to the repository
* **Process:** Validates user authentication → Checks workspace is Git repository with remote → Attempts silent GitHub verification if applicable → Calls `create_team` RPC to create team and add admin → Updates verification metadata if verified

**Example:**
```typescript
const result = await createTeam('Backend Development Squad');
if (result.error) {
  vscode.window.showErrorMessage(result.error);
} else {
  vscode.window.showInformationMessage(
    `Team created! Share this code: ${result.joinCode}`
  );
}
```


### joinTeam Function
Defined in **services/team-service.ts:340**

Joins a team using a 6-character join code with strict project validation.

**Parameters:**
- `joinCode: string` - The 6-character team join code (case-insensitive)

**Returns:** `Promise<{ team?: Team; error?: string; alreadyMember?: boolean }>`
- `team`: The Team object the user joined
- `alreadyMember`: Boolean indicating if user was already a member
- `error`: Error message if join failed

**Pre-conditions:**
- User must be authenticated
- User must have the team's Git repository cloned locally
- Current workspace must match the team's project (validated by Git remote URL and project hash)

**Post-conditions:**
- User is added to `team_membership` table with 'member' role
- Team activity event is logged to track the join action
- User can now access team features and see team activity

**Remarks:**
* **Project Validation:** The function performs strict validation to ensure team members work on the same codebase by comparing Git remote URLs (must match) and verifying project identifier hash (must match)

**Example:**
```typescript
const result = await joinTeam('ABC123');
if (result.error) {
  vscode.window.showErrorMessage(result.error);
} else if (result.alreadyMember) {
  vscode.window.showInformationMessage('You are already a member of this team');
} else {
  vscode.window.showInformationMessage(`Joined team: ${result.team.lobby_name}`);
}
```

### getUserTeams Function
Defined in **services/team-service.ts:471**

Gets all teams the current user is a member of.

**Returns:** `Promise<{ teams?: TeamWithMembership[]; error?: string }>`
- `teams`: Array of TeamWithMembership objects (team data + user's role)
- `error`: Error message if retrieval failed

**Pre-conditions:**
- User must be authenticated with valid Supabase session

**Post-conditions:**
- Returns array of teams with user's membership role included
- Empty array returned if user is not a member of any teams

**Example:**
```typescript
const result = await getUserTeams();
if (result.error) {
  vscode.window.showErrorMessage(result.error);
} else {
  result.teams.forEach(team => {
    console.log(`${team.lobby_name} - Role: ${team.role}`);
  });
}
```

### getTeamMembers Function
Defined in **services/team-service.ts:928**

Gets all members of a team with their profile information.

**Parameters:**
- `teamId: string` - Unique team identifier (UUID)

**Returns:** `Promise<{ members?: TeamMember[]; error?: string }>`
- `members`: Array of TeamMember objects with profile data
- `error`: Error message if retrieval failed

**Pre-conditions:**
- User must be authenticated
- User must be a member of the team (enforced by security check)

**Post-conditions:**
- Returns list of all team members with profile data
- Members are sorted by role (admins first) then by join date
- Skills array combines interests and custom_skills from user_profiles

**Remarks:**
* **Data Sources:** Primary - RPC function `get_team_members_with_users` (accesses auth.users); Fallback - Direct queries to team_membership and user_profiles tables


### deleteTeam Function
Defined in **services/team-service.ts:746**

Deletes a team (admin only). Removes memberships first, then deletes the team.

**Parameters:**
- `teamId: string` - Unique team identifier (UUID)

**Returns:** `Promise<{ success: boolean; error?: string }>`
- `success`: Boolean indicating if deletion was successful
- `error`: Error message if deletion failed

**Pre-conditions:**
- User must be authenticated
- User must be team admin

**Post-conditions:**
- Team record deleted from database
- All team memberships removed
- Associated activity data cleaned up


### leaveTeam Function
Defined in **services/team-service.ts:791**

Leaves a team (member only): removes the current user's membership row for the team.

**Parameters:**
- `teamId: string` - Unique team identifier (UUID)

**Returns:** `Promise<{ success: boolean; error?: string }>`
- `success`: Boolean indicating if leave was successful
- `error`: Error message if leave failed

**Pre-conditions:**
- User must be authenticated
- User must be team member (not admin)

**Post-conditions:**
- User's membership record removed
- Participant status event logged for leave action

**Remarks:**
* Team admins cannot leave the team they administer. They must transfer admin role or delete the team.

***

## Project Detection Service

### getCurrentProjectInfo Function
Defined in **services/project-detection-service.ts**

Gets comprehensive information about the currently open workspace project.

**Returns:** `ProjectInfo | null`
- Project information or null if no workspace open

**Remarks:**
* **Process:** Gets active workspace folder path → Checks if directory is Git repository → Extracts Git remote origin URL → Generates unique project hash from path and remote


### validateCurrentProject Function
Defined in **services/project-detection-service.ts**

Validates that current workspace matches expected project by comparing hash and remote URL.

**Parameters:**
- `projectHash: string` - Expected project hash to validate against
- `remoteUrl?: string` - Optional expected Git remote URL

**Returns:** `{ isMatch: boolean; reason?: string; currentProject?: ProjectInfo }`
- Object with `isMatch` boolean and validation reason

**Remarks:**
* **Use Cases:** Validating user can join team (project must match); Checking if user switched to different project; Ensuring team members work on same codebase
***

## File Snapshot Service

### addFileSnapshot Function
Defined in **services/file-snapshot-service.ts:104**

Inserts a new file snapshot record into the Supabase database.

**Parameters:**
- `input: FileSnapshotInput` - Object containing file path, content, and change description

**Returns:** `Promise<{ success: boolean; id?: string; error?: string }>`
- `success`: Boolean indicating if snapshot was created successfully
- `id`: UUID of the created snapshot record
- `error`: Error message if creation failed

**Pre-conditions:**
- User must be authenticated with Supabase
- An active team must be selected (or team_id provided in input)
- Supabase client must be properly configured

**Post-conditions:**
- New record inserted into `file_snapshots` table
- Snapshot is associated with user_id and team_id
- AI summarization may be triggered asynchronously (handled by edge function)

**Remarks:**
* **Automatic Field Resolution:** `user_id` - Resolved from current auth context by matching email with auth.users; `team_id` - Retrieved from global state (`collabAgent.currentTeam`); `id` - Auto-generated UUID if not provided; `updated_at` - Set to current timestamp if not provided

**Example:**
```typescript
const result = await addFileSnapshot({
  file_path: 'src/services/auth-service.ts',
  snapshot: '...file content...',
  changes: 'Added new signIn function with OAuth support'
});

if (result.success) {
  console.log(`Snapshot created with ID: ${result.id}`);
} else {
  vscode.window.showErrorMessage(result.error);
}
```

***

## Jira Service

### connectJira Function
Defined in **services/jira-service.ts**

Establishes connection to JIRA workspace using API credentials.

**Parameters:**
- `domain: string` - JIRA workspace domain
- `email: string` - JIRA account email
- `apiToken: string` - JIRA API token

**Returns:** `Promise<{ success: boolean; error?: string }>`
- Connection status


### fetchJiraIssues Function
Defined in **services/jira-service.ts**

Retrieves issues from a JIRA project for team task tracking.

**Parameters:**
- `projectKey: string` - JIRA project key

**Returns:** `Promise<{ issues?: any[]; error?: string }>`
- Array of JIRA issues or error


***

## Session Sync Service

### startSessionSync Function
Defined in **services/session-sync-service.ts**

Begins real-time synchronization of team session activity.

**Parameters:**
- `teamId: string` - Team identifier for session

**Returns:** `Promise<{ success: boolean; error?: string }>`
- Sync start status


### stopSessionSync Function
Defined in **services/session-sync-service.ts**

Stops active session synchronization and cleans up resources.

**Returns:** `Promise<void>`


