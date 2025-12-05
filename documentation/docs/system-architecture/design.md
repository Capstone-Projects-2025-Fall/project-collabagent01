---
sidebar_position: 1
---

## Component Overview

CollabAgent consists of several coordinated components that work together to provide AI-assisted summaries, Jira task awareness, user skill profiling, team activity timelines, and Live Share session support. The system is built around a VS Code extension that communicates with a Flask backend, a database for persistence, and external services, including an AI provider, Jira, and VS Code Live Share.

The VS Code extension presents multiple tabs:

- **Intro** – Basic information and onboarding content.
- **User Profile** – View and edit the user’s skill profile and preferences.
- **Tasks (Jira)** – View and filter Jira issues relevant to the user or project.
- **Teams** – Create or join teams and view the team activity timeline.
- **Live Share** – Create or join VS Code Live Share sessions.

<img width="419" height="527" alt="image" src="https://github.com/user-attachments/assets/c139b4ec-5162-4c06-9686-5c7484969137" />


### Key Responsibilities

- **Intro Tab**
  - Displays a general overview of CollabAgent and its capabilities.
  - Provides guidance for first-time users.

- **User Profile Tab**
  - Allows users to define and update their skills, experience, and preferences.
  - Sends profile data to the backend for storage and later use in task recommendations.

- **Tasks (Jira) Tab**
  - Displays Jira issues such as assigned tasks, in-progress items, or project backlogs.
  - Sends requests to the backend to fetch Jira data.
  - Allows users to select tasks for more detailed context.

- **Teams Tab**
  - Supports creating or joining teams within CollabAgent.
  - Shows a team activity timeline that includes recent actions and AI summaries.
  - Requests timeline data from the backend and renders it in a chronological view.

- **Live Share Tab**
  - Provides controls for starting or joining a VS Code Live Share session.
  - Integrates with the Live Share extension API to initiate or join sessions.
  - Optionally notifies the backend so that Live Share events (for example “session started” or “session ended”) can appear in the activity timeline.
 
### Interfaces Consumed and Provided

- **Consumes**
  - VS Code API (commands, webview, configuration).
  - Live Share API (for session creation/joining).
  - Backend REST API (for summaries, Jira data, profiles, and timeline).

- **Provides**
  - A unified sidebar UI that exposes CollabAgent features directly inside VS Code.
  - User actions and context to the backend in the form of HTTP/JSON requests.

---

### Backend Services (Flask + Python)
The backend provides REST endpoints used by the extension and coordinates external integrations.
 Key Responsibilities
- **AI Summaries**
  - Accepts requests from the extension containing code context or task information.
  - Calls an AI provider (e.g., Gemini or ChatGPT) to generate natural language summaries.
  - Returns structured responses to the extension.

- **Jira Integration**
  - Connects to the Jira REST API to retrieve issues, statuses, and metadata.
  - Maps Jira issues to teams or users as needed.
  - Provides filtered task lists for the Tasks tab.

- **User Profile Management**
  - Stores and retrieves user profile data (skills, experience, preferences).
  - Uses profile data when preparing recommendations.

- **Team Activity Timeline**
  - Stores and serves activity events, such as:
    - Timeline notes or status updates from users.
    - Jira issue changes recorded by the system.
    - AI-generated summaries or explanations.
    - Optional Live Share session start/end events.
  - Returns ordered lists of events to populate the Teams tab.

- **Authentication and Configuration**
  - Handles secure communication with the extension.
  - Manages API tokens or configuration for Jira and AI services.
    
---

### Agent Intelligence Layer (AI Provider)

The intelligence layer is implemented using an external AI model provider.

### Key Responsibilities

- **Code and Task Summarization**
  - Generates concise descriptions of code snippets or task context.
- **Recommendation Support**
  - Helps suggest tasks or areas of focus based on profile information and project context.

---

## Database Layer (PostgreSQL / Supabase)

The database provides persistent storage for CollabAgent.

### Stored Data (Conceptual)

- **Users**
  - User identifiers and basic metadata.
- **Profiles**
  - Skill sets, experience levels, and preferences.
- **Teams**
  - Team definitions and membership.
- **Activity Events**
  - Timeline entries such as Jira updates, status notes, AI summaries, and Live Share session events (if recorded).
- **Integration Metadata**
  - Mappings between internal entities and Jira issues or external identifiers.

The backend accesses the database using SQL or an ORM, and no direct database access is exposed to the VS Code extension.

---

## External Services

### Jira REST API

- Provides issue and project data (keys, summaries, statuses, assignees, etc.).
- Called by the backend to supply the Tasks tab and to populate the timeline with task-related events.

### VS Code Live Share

- Provides real-time collaborative editing sessions.
- Invoked from the Live Share tab in the extension, using the Live Share API.
- Session-related metadata can be forwarded to the backend to appear on the team activity timeline.

### AI Model Provider

- Supplies natural language generation for summaries and explanations.
- Called by the backend with structured prompts and context.



