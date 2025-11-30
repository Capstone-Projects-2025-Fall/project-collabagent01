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

**Backend Services**
**Flask (Python)**
 The backend manages communication, synchronization, and activity monitoring between extension clients and the Agent Bot.
  * Key Features:
    - Session Control – Creates, joins, and maintains collaboration sessions.
    - File/Change Broadcasting – Distributes edits and events in real time.
    - Activity Logging – Records user actions such as file opens, edits, and saves.
    - Bot Integration – Relays activity updates and status changes to the Agent Bot.

**Agent Bot**
**Collaboration Assistant**
 The Agent Bot helps teams stay coordinated by monitoring activity and providing intelligent feedback inside the extension sidebar.
  * Key Features:
    - Activity Monitoring – Posts updates like “Ben opened auth.js” or “Nick is editing Login.jsx.”
    - Manual Status Updates – Users can broadcast what task they’re working on with one click.
    - Smart Task Detection – Suggests likely tasks based on recent file activity and editing patterns.
    - Team Feed – Maintains a scrollable history of team actions for easy reference.
    
**Database & Authentication**
**(Planned – PostgreSQL/Supabase)**
 The system will use a database service to store and manage collaborative data.
  * Planned Features:
    - User Authentication – Secure login and session tracking.
    - Session Storage – Saves collaboration session details and connected members.
    - Activity History – Stores file edits, bot messages, and status updates for analytics.
    - Real-Time Sync – Ensures updates propagate instantly across all users.

   
**Entity-Relationship Diagram**
<img width="896" height="590" alt="Screenshot 2025-09-21 171425" src="https://github.com/user-attachments/assets/9568ba25-8d4d-4b31-91a3-5097f2a78e39" />

**Table Design**

<img width="622" height="250" alt="Screenshot 2025-10-03 193154" src="https://github.com/user-attachments/assets/5815334a-d4a8-4259-bde6-c8479180062c" />

<img width="641" height="221" alt="Screenshot 2025-10-03 193201" src="https://github.com/user-attachments/assets/a0f69232-2139-46e4-bd84-dd29b6e9cf33" />

<img width="572" height="218" alt="Screenshot 2025-10-03 193209" src="https://github.com/user-attachments/assets/d03f4866-90ca-4b66-8212-c56e5fe53cb8" />

<img width="616" height="255" alt="Screenshot 2025-10-03 193217" src="https://github.com/user-attachments/assets/6d4d0176-22a0-49b3-b1c7-ac0c573cffad" />



