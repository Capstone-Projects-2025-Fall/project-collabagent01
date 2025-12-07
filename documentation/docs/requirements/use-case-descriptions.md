---
sidebar_position: 5
---

# Use-case descriptions

## Use Case 1 - Team Creation and Project Association

*As a user, I want to create a team lobby and associate it with my current project so teammates can collaborate.*

1. The user opens VS Code with the Collab Agent extension installed and signs in with their account.
2. The user navigates to the extension sidebar and clicks "Create New Team."
3. The user enters a team name (e.g., "Backend Development Squad") in the input field.
4. The extension generates a unique 6-character join code and creates the team in Supabase with the user as the team admin.
5. The extension automatically detects the current project's Git repository information and associates it with the team.
6. The user sees the join code displayed prominently with a "Copy Code" button to share with teammates.
7. The user shares the join code with teammates via email, Slack, or other communication channels.
8. When teammates enter the join code in their extension, they are added to the team and can see the associated project information.
9. All team members can now view team activity, file snapshots, and collaborate within the same project context.

<img width="850" height="868" alt="Usecase4" src="https://github.com/user-attachments/assets/f312be2a-e1e5-45e8-83dd-c8c09d90c30c" />

## Use Case 2 – Team Collaboration Settings & Permissions Setup

*As a user, I want to configure my team’s collaboration settings so our workflow, AI snapshots, and Live Share tracking behave the way we need.

1. The user opens VS Code and selects their active team from the Collab Agent sidebar.
2. The user clicks the "Team Settings" button to open the collaboration configuration panel.
3. The extension loads the current settings from Supabase, including AI snapshot preferences, notification options, and Live Share tracking levels.
4. The user adjusts the AI Snapshot frequency (e.g., every 20 minutes) and selects which events should trigger automatic snapshots (file saves, branch switches, or milestone commits).
5. The user configures Live Share tracking sensitivity, choosing whether to track cursor activity, file focus, terminal usage, and code edits during collaboration sessions.
6. The user sets permissions for teammates—such as who can delete snapshots, who can edit team details, and whether the professor has read-only access to dashboards and summaries.
7. If the team is using Jira, the user toggles on “Jira Linking” to allow snapshot summaries to attach automatically to Jira tasks.
8. The user clicks “Save Settings,” prompting the extension to sync all preferences to Supabase and notify teammates of the updated configuration.
9. Team members now operate within a consistent collaboration workflow, with AI snapshots, tracking, and visibility rules aligned to the team’s goals.

<img width="1202" height="924" alt="image" src="https://github.com/user-attachments/assets/a5620480-a0f2-4836-b415-b1c9ba059c34" />

## Use Case 3 - Project Validation and Team Switching

*As a user, I want to switch between multiple teams and have the extension validate that I'm working on the correct project.*

1. The user is currently working with Team Alpha on a React frontend project.
2. The user opens the extension sidebar and clicks "Switch Team" to view all teams they're a member of.
3. The user selects Team Beta, which is associated with a different backend API project.
4. The extension detects that the current VS Code workspace doesn't match Team Beta's associated project.
5. The extension displays a warning: "Project mismatch detected. Team Beta is associated with 'backend-api-service' but you're currently in 'frontend-react-app'."
6. The extension offers three options: "Open Team Project," "Continue Anyway," or "Cancel."
7. The user clicks "Open Team Project," and the extension opens the correct project folder in a new VS Code window.
8. The extension validates the project by checking the Git remote URL and project structure hash.
9. Once validated, the extension displays: "You're now working with Team Beta on the correct project" and enables team features like activity tracking and file snapshots.

<img width="1087" height="1445" alt="Usecase8" src="https://github.com/user-attachments/assets/43ef4ea3-3cdd-4fc5-b3f3-980d58352e59" />

## Use Case 4 - Live Share Session with Team Activity Tracking

*As a user, I want to start a Live Share session and have the extension automatically log session activity for my team.*

1. The user opens VS Code with their team project and navigates to the Collab Agent extension sidebar.
2. The user clicks "Start Live Share Session" in the extension panel.
3. The extension creates a Live Share session and generates a shareable link.
4. The extension automatically logs a team activity event to Supabase: "User started a Live Share session" with a timestamp.
5. The user shares the Live Share link with teammates via the extension's built-in share button.
6. When teammates join the session, the extension logs participant join events: "Teammate joined the Live Share session."
7. During the session, the extension tracks which files are being collaboratively edited and logs significant changes.
8. When the user ends the Live Share session, the extension logs a session end event with duration and participant count.
9. All team members can view the session history in the Team Activity Feed, including who participated and what files were worked on.

<img width="1239" height="1221" alt="Usecase7" src="https://github.com/user-attachments/assets/e55de538-7666-4307-ac81-029e7fba03f6" />

## Use Case 5 - Pair Programming with AI Snapshots

*As a user, I want automatic AI-powered insights into my team's coding activity through file snapshots.*

1. The user opens VS Code, installs the Collab Agent extension, and signs in with their student email.
2. The extension stores their authentication context and associates them with Team Alpha.
3. User edits auth-service.ts and file-snapshot-service.ts as part of their normal workflow.
4. Every time the User makes meaningful changes, the extension automatically creates a file snapshot (file path, snapshot content, change summary, timestamp).
5. The extension calls addFileSnapshot, resolving the user's Supabase auth user ID and active team from the global context, and inserts each snapshot into the file_snapshots table with user_id, team_id, and file info.
6. Teammate pulls the repo, opens VS Code with the same extension, and signs in. Their snapshots are also tied to Team Alpha under their own user ID.
7. The team opens the AI-powered insights dashboard (webview/external UI), which reads snapshot data from Supabase and feeds it into an AI backend.
8. The dashboard shows who's been working on which files, recent risky changes or error-prone zones, and suggested refactors or tests to add.
9. The user and their teammate see that their auth flow is repeatedly changed and flagged as "high risk," so they decide to refactor together using the AI suggestions to clean it up.

<img width="1250" height="912" alt="Screenshot 2025-12-02 182001" src="https://github.com/user-attachments/assets/b9b2bd35-04f1-4290-a6d4-5080938bfcd1" />

## Use Case 6 - Professor Monitors Student Progress via Snapshot Summaries

*As a professor, I want to review AI-generated summaries of student coding activity to provide targeted guidance.*

1. The student works on their course project in VS Code using the Collab Agent extension.
2. As the student edits files—fixing functions, adding API calls, and experimenting with logic—the extension automatically captures snapshots of each save and sends them to Supabase.
3. Later in the week, the Professor logs into the course dashboard to monitor student progress.
4. For each student, the dashboard displays AI-generated summaries built from collected snapshots, showing patterns, common errors, unfinished work, and signs of confusion.
5. When reviewing the student's summaries, the Professor notices recurring themes: the student repeatedly changes input validation logic and keeps adjusting error handling around the same API route.
6. The summary indicates uncertainty about correct parameter usage in user-api.ts.
7. During office hours, the Professor uses these insights to provide targeted guidance: "I saw you've been reworking the validation in user-api.ts. Let's walk through how the request schema should look."
8. Professor continues: "It looks like you might be having trouble with error propagation—want to revisit how we structure our service responses?"
9. The student receives specific, relevant help based on their actual coding struggles without needing to ask for help or describe the problem explicitly.

<img width="1258" height="727" alt="Screenshot 2025-12-02 183829" src="https://github.com/user-attachments/assets/12a48a76-92a6-490b-a954-5c6ca0e7a680" />

## Use Case 7 - Instructor Reviews Team Contribution via Activity Dashboard

*As an instructor/team lead, I want to review each team member's contribution and activity without manually digging through Git logs.*

1. Each team member works locally in VS Code with the Collab Agent extension installed.
2. All team members are signed in and associated with Team Beta via collabAgent.currentTeam.
3. As they work, every significant change to files produces a snapshot that is stored in Supabase with user_id, team_id, file path, timestamp, and change summary.
4. The Professor/Team lead opens the instructor dashboard, which queries the file_snapshots table grouped by team_id and user_id.
5. The dashboard displays the number of snapshots per user, files touched by each member, and recent activity windows (e.g., last 24–72 hours).
6. Patterns emerge clearly: one student has many snapshots on backend services, another has mostly UI files and styling, and a third shows sparse activity overall with very few snapshots.
7. Professor/Team lead clicks on a student's timeline to drill into detailed snapshot info—file paths, timestamps, and diffs.
8. The data reveals that the student joined late or isn't contributing evenly to the project.
9. Professor/Team lead uses this information to talk to the team about workload balance, offer support to the student, and incorporate snapshot data into grading or participation rubrics.

<img width="1148" height="794" alt="Screenshot 2025-12-02 182150" src="https://github.com/user-attachments/assets/559d595b-4f47-4a42-a1bd-6eaf15b176ff" />



## Use Case 8 - Jira Integration for Sprint Management

*As a team lead, I want to connect my team's Jira workspace to track sprint tasks directly in VS Code.*

1. The team lead opens the Collab Agent extension sidebar and navigates to the "Team Settings" section.
2. The team lead clicks "Connect Jira" and is prompted to choose between OAuth authentication or manual credentials.
3. The team lead selects manual credentials and enters their Jira site URL, email, and API token.
4. The extension tests the connection by fetching available projects and displays them for confirmation.
5. The team lead selects the relevant project, and the extension saves the Jira configuration to Supabase associated with the team ID.
6. The extension displays a "Tasks" panel showing the current sprint's issues with status, assignee, and story points.
7. Team members can now view sprint tasks, backlog items, and update issue statuses directly from VS Code.
8. When a team member clicks on a task, they can transition it (e.g., "To Do" → "In Progress"), reassign it, or update story points.
9. All changes sync immediately to Jira, and the team can track progress without leaving their development environment.

<img width="1032" height="1243" alt="Usecase5" src="https://github.com/user-attachments/assets/ec9ad494-fba5-402f-85da-501aa062c51f" />





