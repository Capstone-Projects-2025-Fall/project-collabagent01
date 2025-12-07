---
sidebar_position: 2
---
# Integration tests

## Integration Test 1: Team Creation and Project Association

**Test Objective**: Verify that a user can create a team lobby, generate a join code, and associate it with their current project automatically.

**Mock Requirements**:
- Mock Supabase client for database operations
- Mock VS Code authentication provider
- Mock Git repository information
- Mock clipboard API for copy functionality

**Test Steps**:
1. Initialize mock user authentication state (signed in)
2. Mock VS Code workspace with Git repository information
3. Trigger "Create New Team" command
4. Provide mock input "Backend Development Squad" as team name
5. Mock Supabase response to return success for team creation with generated 6-character join code
6. Mock automatic Git repository detection
7. Verify team creation in mock database with correct fields (team name, join code, admin user)
8. Verify project association with Git remote URL and project hash
9. Verify join code is displayed in UI
10. Mock teammate joining with the join code
11. Verify teammate is added to team member list
12. Verify teammate can access team information and project context

**Expected Results**:
- Team is created in Supabase with unique 6-character join code
- User is set as team admin
- Git repository information is correctly associated with team
- Join code is displayed with copy functionality
- Teammates can successfully join using the code
- All team members have access to shared project context

---

## Integration Test 2: Team Collaboration Settings & Permissions Setup

**Test Objective**: Verify that team admins can configure collaboration settings including AI snapshots, Live Share tracking, and permissions.

**Mock Requirements**:
- Mock Supabase client for settings storage
- Mock team context with admin privileges
- Mock UI components for settings panel
- Mock notification system for team updates

**Test Steps**:
1. Initialize mock team with user as admin
2. Open "Team Settings" panel via command
3. Mock loading current settings from Supabase
4. Update AI Snapshot frequency to 20 minutes
5. Select snapshot triggers: file saves, branch switches, milestone commits
6. Configure Live Share tracking: cursor activity, file focus, terminal usage enabled
7. Set teammate permissions: assign read-only access to professor role
8. Enable "Jira Linking" toggle
9. Save settings and mock Supabase update operation
10. Verify settings are persisted correctly in mock database
11. Mock notification sent to all team members
12. Verify team members receive configuration update notification

**Expected Results**:
- All settings are saved to Supabase with correct team_id
- AI snapshot frequency is set to 20 minutes
- Selected triggers are stored correctly
- Live Share tracking preferences are persisted
- Permission rules are enforced (professor has read-only access)
- Jira integration flag is enabled
- All team members are notified of setting changes

---

## Integration Test 3: Project Validation and Team Switching

**Test Objective**: Verify that the extension validates project context when switching between teams and alerts users of project mismatches.

**Mock Requirements**:
- Mock multiple teams with different project associations
- Mock VS Code workspace context
- Mock Git repository information
- Mock warning dialog system
- Mock workspace opening functionality

**Test Steps**:
1. Initialize user with membership in Team Alpha (React frontend) and Team Beta (Backend API)
2. Set current workspace to "frontend-react-app" project
3. Set active team to Team Alpha
4. Trigger "Switch Team" command
5. Select Team Beta from team list
6. Mock project validation that detects mismatch (Team Beta expects "backend-api-service")
7. Verify warning dialog displays with correct message
8. Verify three options are presented: "Open Team Project", "Continue Anyway", "Cancel"
9. Select "Open Team Project" option
10. Mock opening correct project folder in new VS Code window
11. Verify Git remote URL validation
12. Verify project structure hash validation
13. Verify success message displays
14. Verify team features are enabled for correct project

**Expected Results**:
- Extension detects project mismatch correctly
- Warning message displays expected vs actual project names
- User can choose to open correct project automatically
- Git remote URL and project hash are validated
- Team features are only enabled when project validation passes
- Success confirmation is shown after correct project is opened

---

## Integration Test 4: Live Share Session with Team Activity Tracking

**Test Objective**: Verify that starting a Live Share session automatically logs team activity events and tracks participant actions.

**Mock Requirements**:
- Mock Live Share API
- Mock Supabase client for activity logging
- Mock team context
- Mock participant join/leave events
- Mock file editing tracking

**Test Steps**:
1. Initialize user with active team and project
2. Trigger "Start Live Share Session" command
3. Mock Live Share session creation with shareable link
4. Verify activity log entry: "User started a Live Share session" with timestamp
5. Mock sharing link with team members
6. Mock teammate joining session
7. Verify activity log entry: "Teammate joined the Live Share session"
8. Mock collaborative file editing on multiple files
9. Verify file activity is tracked and logged
10. Mock session end event
11. Verify session end log with duration and participant count
12. Query Team Activity Feed and verify all events are present
13. Verify session history shows participants and edited files

**Expected Results**:
- Live Share session is created successfully
- Session start event is logged to Supabase with timestamp
- Participant join events are logged with user information
- Collaborative file edits are tracked during session
- Session end event includes duration and participant count
- All team members can view complete session history in Activity Feed
- Session metadata includes files worked on and participant list

---

## Integration Test 5: Pair Programming with AI Snapshots

**Test Objective**: Verify that the extension automatically creates file snapshots during coding activities and provides AI-powered insights.

**Mock Requirements**:
- Mock Supabase client for snapshot storage
- Mock authentication context
- Mock file system events
- Mock AI insights dashboard
- Mock team context

**Test Steps**:
1. Initialize user signed in and associated with Team Alpha
2. Mock opening and editing auth-service.ts
3. Make meaningful changes to file (add function, modify logic)
4. Trigger automatic snapshot creation on save
5. Verify snapshot contains: file path, content, change summary, timestamp, user_id, team_id
6. Mock editing file-snapshot-service.ts
7. Trigger another automatic snapshot
8. Verify both snapshots are stored in Supabase
9. Mock teammate signing in and editing files
10. Verify teammate's snapshots are created with their user_id
11. Open AI insights dashboard (mock webview)
12. Query snapshots from Supabase grouped by file and user
13. Mock AI analysis identifying auth flow as "high risk" due to frequent changes
14. Verify dashboard displays file activity, risk zones, and refactor suggestions
15. Verify both user and teammate can see consolidated insights

**Expected Results**:
- File snapshots are automatically created on meaningful changes
- Each snapshot includes correct user_id, team_id, file path, timestamp
- Snapshots from different team members are stored separately but associated with same team
- AI dashboard successfully queries and displays snapshot data
- AI analysis identifies patterns (frequent changes, risky areas)
- Refactor suggestions are generated based on snapshot patterns
- Both users can access shared insights for collaborative improvement

---

## Integration Test 6: Professor Monitors Student Progress via Snapshot Summaries

**Test Objective**: Verify that professors can access AI-generated summaries of student coding activity to provide targeted guidance.

**Mock Requirements**:
- Mock Supabase client for snapshot queries
- Mock student authentication and team context
- Mock professor dashboard access
- Mock AI summarization service
- Mock file editing events

**Test Steps**:
1. Initialize student user with course project team
2. Mock student editing files over multiple sessions
3. Create snapshots for: fixing functions, adding API calls, adjusting validation logic
4. Mock repeated changes to user-api.ts input validation (5+ snapshots)
5. Mock repeated error handling adjustments in same file
6. Store all snapshots with student user_id and team_id
7. Initialize professor user with instructor role
8. Open course dashboard with professor credentials
9. Query student snapshots from Supabase
10. Mock AI summary generation identifying patterns:
    - Repeated validation logic changes
    - Multiple error handling adjustments in user-api.ts
    - Signs of uncertainty about parameter usage
11. Display summary in professor dashboard
12. Verify summary highlights problem areas with file references
13. Mock professor using insights during office hours
14. Verify professor can drill down into specific snapshot details

**Expected Results**:
- Student snapshots are captured automatically during work sessions
- Snapshots include enough detail for AI analysis (file content, changes, context)
- Professor dashboard successfully queries student snapshots by user_id
- AI-generated summary identifies meaningful patterns:
  - Recurring problem areas (user-api.ts validation)
  - Signs of struggle (repeated rework of same code)
  - Specific files and functions needing guidance
- Professor receives actionable insights without manual code review
- Professor can provide targeted help based on actual coding patterns

---

## Integration Test 7: Instructor Reviews Team Contribution via Activity Dashboard

**Test Objective**: Verify that instructors can review team member contributions through snapshot analytics without manual Git log analysis.

**Mock Requirements**:
- Mock Supabase client for snapshot aggregation
- Mock multiple team members with different activity patterns
- Mock instructor dashboard with analytics
- Mock team context (Team Beta)

**Test Steps**:
1. Initialize Team Beta with 3 members: Student A, Student B, Student C
2. Mock Student A creating 45 snapshots across backend service files over 7 days
3. Mock Student B creating 38 snapshots across UI and styling files over 7 days
4. Mock Student C creating 8 snapshots with sparse activity (only 2 days active)
5. Store all snapshots with respective user_id and team_id (Team Beta)
6. Initialize instructor user and open instructor dashboard
7. Query file_snapshots grouped by team_id and user_id
8. Verify dashboard displays:
   - Snapshot count per student
   - Files touched by each student
   - Activity timeline (last 24-72 hours)
9. Verify Student A shows backend focus (services, APIs)
10. Verify Student B shows frontend focus (components, styles)
11. Verify Student C shows sparse activity pattern
12. Click on Student C timeline to drill into details
13. Verify detailed view shows specific files, timestamps, and change patterns
14. Verify activity gap analysis identifies late start or low contribution

**Expected Results**:
- Dashboard successfully aggregates snapshots by team and user
- Snapshot counts accurately reflect each student's activity level
- File categorization shows clear work distribution patterns
- Activity timelines reveal contribution frequency
- Low-activity student (Student C) is clearly identified
- Drill-down view provides specific snapshot details and timestamps
- Instructor gains clear visibility into workload distribution
- Data can be used for participation grading and team balance assessment

---

## Integration Test 8: Jira Integration for Sprint Management

**Test Objective**: Verify that team leads can connect Jira workspaces and team members can view/update sprint tasks from VS Code.

**Mock Requirements**:
- Mock Jira API client
- Mock Supabase for Jira configuration storage
- Mock authentication (OAuth and manual credentials)
- Mock Jira project and issue data
- Mock VS Code webview for task panel

**Test Steps**:
1. Initialize team lead user with active team
2. Open "Team Settings" and select "Connect Jira"
3. Choose manual credentials authentication
4. Provide mock inputs:
   - Jira site URL: "https://company.atlassian.net"
   - Email: "teamlead@example.com"
   - API token: "mock_api_token_12345"
5. Mock Jira API connection test
6. Mock API response with available projects list
7. Select project "Collab Agent Sprint"
8. Save configuration to Supabase with team_id
9. Verify configuration is persisted correctly
10. Mock fetching current sprint issues from Jira API
11. Verify "Tasks" panel displays sprint issues with:
    - Issue key, summary, status, assignee, story points
12. Mock team member clicking on a task
13. Mock status transition from "To Do" to "In Progress"
14. Verify API call to Jira updates issue status
15. Mock reassigning task to different team member
16. Verify Jira API receives reassignment request
17. Refresh task panel and verify changes are reflected
18. Verify changes sync to Jira web interface

**Expected Results**:
- Jira connection is established with manual credentials
- Available projects are fetched and displayed for selection
- Configuration is saved to Supabase with encrypted credentials
- Current sprint tasks are displayed in VS Code panel
- Task details include all relevant fields (status, assignee, story points)
- Status transitions work correctly and sync to Jira
- Task reassignment updates both locally and in Jira
- All changes are reflected immediately without leaving VS Code
- Team can manage sprint workflow entirely within development environment

---
