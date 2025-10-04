---
sidebar_position: 5
---

# Use-case descriptions

## Use Case 1 - Real-Time Code Synchronization Setup
*As a user, I want to enable real-time collaborative editing with my team.*
1. The user opens VS Code and navigates to the Agent extension sidebar.
2. The user clicks "Start Collaboration Session" and creates a new session name (e.g., "Frontend Sprint Work").
3. The extension generates a session invite link/code that the user shares with teammates.
4. Teammates join the session by clicking the link or entering the session code in their agent extension.
5. The user sees a list of connected team members in the sidebar with colored indicators (each person gets a unique cursor color).
6. The extension enables real-time synchronization. When any team member types, others see the changes instantly with colored cursors showing who is editing and where.
   <img width="966" height="659" alt="Screenshot 2025-09-21 162754" src="https://github.com/user-attachments/assets/6cae0478-9a75-44f5-ba3b-0e2d2c9c95c8" />


## Use Case 2 - Live Editing Collaboration
*As a user, I want to see my teammates' edits in real time while working on the same project.*
1. Multiple team members are connected to the same collaboration session.
2. When a teammate opens a file, the user sees a notification: "Nick opened components/Login.jsx" in the agent sidebar.
3. As the teammate types, the user sees their cursor and text changes appearing in real-time with their assigned color.
4. When the user opens the same file, both cursors are visible and edits sync instantly.
5. The user can see, line by line, who made what changes through colored highlighting that briefly appears after each edit.
6. Multiple team members can edit different parts of the same file simultaneously without conflicts.
   <img width="803" height="616" alt="Screenshot 2025-09-21 162828" src="https://github.com/user-attachments/assets/6e3c7765-8a5f-499f-9430-6a86093891dc" />


## Use Case 3 - Agent Bot Activity Monitoring
*As a user, I want to see what files and tasks my teammates are working on via the Agent Bot.*
1. The agent bot sidebar displays a "Team Activity" section showing real-time updates.
2. When a teammate opens a file, the agent bot posts: "Ben opened src/api/auth.js" with a timestamp.
3. When a teammate starts typing in a file, the bot updates: "Ben is editing auth.js" with a live indicator.
4. When a teammate saves or closes a file, the bot posts: "Ben finished working on auth.js (worked for 23 minutes)".
5. The user can click on any activity update to quickly navigate to that file and see what their teammate was working on.
6. The sidebar maintains a scrollable history of the last 50 team activities for reference.
   <img width="1188" height="502" alt="Screenshot 2025-09-21 162934" src="https://github.com/user-attachments/assets/d94e7041-4c3c-43fe-a8c9-131ce6329866" />


## Use Case 4 - Manual Task Status Updates
*As a user, I want to manually tell my team what I'm currently working on through the agent bot.*
1. The user clicks the "update status" button in the agent bot sidebar.
2. A quick input field appears with the placeholder "What are you working on?"
3. The user types their current task (e.g., "Fixing login validation bug" or "Refactoring user dashboard).
4. The user clicks "share" or hits enter to broadcast the status.
5. The agent bot immediately posts to all teammates: "You are working on: Fixing login validation bug" in their sidebars.
6. The status remains visible in the sidebar until the user updates it or starts working on a different file (which the bot can detect and ask if they want to update their status).
   <img width="686" height="485" alt="Screenshot 2025-09-21 163004" src="https://github.com/user-attachments/assets/42cc78ff-44b3-4913-8e9e-9056eba2f024" />


## Use Case 5 - Agent Bot Smart Task Detection
*As a user, I want the Agent Bot to intelligently guess what I'm working on based on my file activity.*
1. The user starts editing a file (e.g., components/UserProfile.jsx).
2. The agent bot analyzes the file name, recent changes, and code context.
3. After 2-3 minutes of active editing, the agent bot suggests: "It looks like you're working on user profile updates. Should I share this with your team?"
4. The user can click "Yes" to broadcast the status, "No" to dismiss, or "Edit" to customize the message.
5. If the user clicks "Yes," the agent bot posts: "You are working on: User profile component updates" to teammates' sidebars.
6. The user can set preferences for how often the bot makes these suggestions (always ask, auto share, or never suggest).
   <img width="1261" height="606" alt="Screenshot 2025-09-21 163035" src="https://github.com/user-attachments/assets/74c1bbce-3499-45b4-8433-c34c8495f617" />



