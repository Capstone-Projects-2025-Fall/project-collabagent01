---
sidebar_position: 1
---

### Component Overview
The AI-Assisted Collaboration assistant project will contain components and technologies, including making use of a VSCode extension ‘Live Share’ for real-time coding  collaboration. We will also be making use of a Database to store information for its users.

**Main Application**
**VS Code Extension (TypeScript, Node.js)**
 The core of the system is a VS Code extension that enables real-time collaborative editing across teams.
  * Key Features:
    - Collaboration Sessions – Users can start or join named sessions with unique invite codes.
    - Live Editing Sync – Every keystroke, cursor movement, and file open event is synced instantly across all team members.
    - Colored Cursors & Highlights – Each user gets a unique color to identify their edits.
    - Session Management – Sidebar shows active members and connected session status.

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



