---
sidebar_position: 2
---

# System Block Diagram
<!-- <img width="1214" height="571" alt="image" src="https://github.com/user-attachments/assets/de7ef793-e0b4-421a-82e9-88cdf77c6717" /> -->
<!-- <img width="1803" height="454" alt="image" src="https://github.com/user-attachments/assets/f0f49800-452c-444e-a11b-bf56adb2ce1b" /> -->
<img width="1795" height="395" alt="image" src="https://github.com/user-attachments/assets/b01e69a3-fad6-403d-989e-a48a465af69a" />






# Description
The workflow begins when the user interacts with the VS Code IDE, where the extension’s internal components including authentication modules, views, commands, and services process these initial actions locally. To handle more complex logic, the extension’s services communicate with a central Flask backend via secure HTTP requests. Upon receiving these requests, the backend acts as a coordinator, querying the Supabase database for persistent storage and calling the Gemini AI API to generate intelligent features. Throughout this entire process, secure access is managed through GitHub OAuth and Supabase authentication, while real-time team collaboration is seamlessly enabled through an integration with VS Code Live Share.

## 1. VS Code Extension Layer (Light Colors)

Light Green: Entry Point & Authentication (Handles extension initialization and user login via GitHub OAuth/Supabase).

Light Blue: Views (The 6 webview panels including Agent, Tasks, and Snapshot Manager).

Light Orange: Commands (Handlers for triggers like Jira integration and GitHub tokens).

Light Purple: Services (The 9 core internal services managing teams, git operations, and session synchronization).

## 2. Flask Backend Server (Dark Colors)

Dark Blue: API & Routes (The central REST endpoints and route organization receiving HTTP requests).

Dark Green: Backend Logic & Database (The business logic services and database layer that handle queries and external interactions).

## 3. External Services (Gray)

Gray: Represents all third-party integrations and storage, including Supabase DB, GitHub OAuth, Jira API, Live Share, and Gemini AI.
