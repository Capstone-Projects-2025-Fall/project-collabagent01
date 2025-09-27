---
sidebar_position: 2
---

# System Block Diagram
<img width="1214" height="571" alt="image" src="https://github.com/user-attachments/assets/de7ef793-e0b4-421a-82e9-88cdf77c6717" />


# Description
The system starts when a user installs the CollabAgent extension in VS Code. The extension provides two main features: Live Share and Agent01. To use Live Share, the extension checks whether the required third-party Live Share extension is already installed in VS Code. If it isn’t, the system installs it automatically so the user can start using that feature. The Agent01 feature requires users to be logged in, and login is handled through OAuth, which allows sign-in with Google. If both login and installing of live share extension is done, the extension activates two main parts, Live Share (SYN) for session sharing, team activity, and chat, and Agent 01 (ASYN) for tracking tasks, changes, and lobby creation.

The extension connects to the Live Share API for real-time collaboration, which manages sessions, authentication, team activity, and chat. The agent feature connects to a central backend server (Flask) that coordinates data flow. The backend logs activity through an AI Agent, which uses gemini api key to record edits, commits, and participation details. All user and team information is stored in a Supabase database, which manages accounts, teams, memberships, and activity logs. The frontend (React) provides an friendly user interface. 
