# Features and Requirements

## Extension Setup and Authentication

CollabAgent integrates Supabase OAuth to provide a secure authentication gateway for all collaboration features. The system establishes user identity and maintains persistent sessions across VS Code instances, forming the foundation for team-based collaboration and activity tracking.

### Functional Requirements
- Users must download the CollabAgent extension and create an account
- Users must be signed in to start or join a collaboration session
  
### Non-Functional Requirements
- User credentials and session data must be encrypted and securely stored
- Login failures must be handled gracefully with clear error messaging 

---

## Collaboration Session Management

This feature orchestrates the creation and lifecycle of collaborative coding sessions through Live Share integration. Users can establish named sessions with shareable invite codes, enabling  team coordination and controlled access to collaborative workspaces.

### Functional Requirements
- Users can start a session, give it a name, and send an invite link to team members 
- The extension generates a unique invite link for session sharing
- Team members can join sessions by clicking the invite link
- The host can end the session, which disconnect all participants

### Non-Functional Requirements
- Session state must be synchronized across all participants within 500ms 
- Failed session joins must provide clear feedback to users

---

## Real-Time Code Synchronization

Built on Microsoft's Live Share API, this feature transforms VS Code into a multiplayer coding environment where changes propagate instantly across all connected developers. The system maintains workspace consistency through automatic conflict resolution and resilient network handling.

### Functional Requirements
- The IDE must support real-time synchronization where all edits appear instantly across team members' editors 
- Multiple team members can edit the same file simultaneously without conflicts
- Notifications must appear when teammates open, edit, or close files

### Non-Functional Requirements
- The synchronization system must handle conflicts gracefully without data loss
- Network interruptions must not cause permanent desynchronization 

---

## Agent Bot Activity Monitoring

The Agent Bot serves as an intelligent observer that captures and displays team collaboration events in a centralized feed. It combines Live Share session tracking with AI-powered code analysis to provide contextual summaries of development activity, helping teams maintain awareness of ongoing work.

### Functional Requirements
- The Agent tab must include a team activity feed showing real time updates
- When a Live Share session starts, the agent bot posts session notifications with timestamps
- When a Live Share session ends, the agent bot posts session summaries with participant information
- AI-generated summaries of code changes must be posted to the activity feed

### Non-Functional Requirements
- The activity feed must display the last 50 activities without performance degradation
- Activity data must be consistent across all team members' views 

---

## Team Project Management 

This feature ensures development consistency by linking teams to specific Git repositories and validating workspace alignment before collaboration begins. It prevents common mistakes like working on wrong branches or outdated codebases by enforcing project compatibility checks during team operations.

### Functional Requirements
- Users can validate the current project against the selected team 
- The system must check project compatibility before allowing team switching
- Team admins can update the team's project information
- Users can open the team's designated project folder 

### Non-Functional Requirements
- Project validation must complete within 2 seconds for typical project sizes
- The system must support teams with up to 50 members
- Project compatibility checks must be accurate and prevent invalid team assignments

---

## Jira Task Integration

CollabAgent bridges the gap between project management and development by embedding Jira functionality directly into VS Code. Teams can manage sprints, update issue statuses, and track story points without context-switching, creating a unified workflow from planning to implementation.

### Functional Requirements
- Team admins can configure Jira integration with URL, email and API token
- The extension must synchronize Jira issues and display them in the tasks panel
- Users can view, update, and transition Jira tasks from within VS Code
- Sprint and backlog management must be supported

### Non-Functional Requirements
- The integration must handle Jira API rate limits gracefully without user intervention
- Task updates must be reflected in Jira within 5 seconds of changes in VS Code
- The system must maintain data consistency between VS Code and Jira during network issues

---

## User Profile Management

The profile system establishes developer identity within teams through customizable display names and role-based permissions. It creates a persistent identity layer that connects individual developers to their teams, projects, and collaboration history across the platform.

### Functional Requirements
- Users can set and update their display names for team identification
- The system must support team membership and role management (admin/member)
- User profiles must persist across sessions and devices

### Non-Functional Requirements
- Profile updates must be saved and synchronized within 2 seconds
- The system must support user profiles with up to 1000 characters of custom data
- Display names must be unique within a team context to prevent confusion

---

## Session Activity Logging

This feature creates an auditable history of collaboration sessions by capturing file modifications, participant actions, and session metadata. The logging system supports retrospective analysis and project documentation by maintaining searchable records of team development activities over time.

### Functional Requirements
- The system must track and store file changes during collaboration sessions
- Session summaries must be generated and stored for historical reference
- Activity feeds must maintain chronological records of team actions

### Non-Functional Requirements 
- Activity logs must be searchable and retrievable within 3 seconds
- The system must retain activity data for at least 90 days
- Activity logging must not impact real-time collaboration performance
