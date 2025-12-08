---
sidebar_position: 2
---

# System Block Diagram
<!-- <img width="1214" height="571" alt="image" src="https://github.com/user-attachments/assets/de7ef793-e0b4-421a-82e9-88cdf77c6717" /> -->
<!-- <img width="1803" height="454" alt="image" src="https://github.com/user-attachments/assets/f0f49800-452c-444e-a11b-bf56adb2ce1b" /> -->
<!-- <img width="1551" height="771" alt="image" src="https://github.com/user-attachments/assets/c289e0ec-39e3-49f1-8a88-b3e1b561af57" /> -->
<img width="721" height="392" alt="image" src="https://github.com/user-attachments/assets/de5f7d7f-fdc0-49db-8244-7228476ced18" />







# Description

**Collab Agent** is a collaborative development platform that integrates seamlessly with VS Code through an extension layer. The system architecture consists of the following key components:

**Frontend**: Users interact with the system through VS Code IDE, where the Extension Layer provides the primary interface via a webview UI. The VS Code Live Share API (Microsoft's extension) enables real-time collaboration capabilities.

**Core Services**: The Flask API Backend Server acts as the central hub, orchestrating all business logic and data flows. It processes API requests and manages communication with external services and databases.

**Data Flow**:
- **Requests (Yellow)**: Users send collaboration API calls and HTTP requests through the Extension Layer to the Flask backend. The backend forwards requests to the Gemini API for AI-powered features and to the Jira API for task tracking. Live Share data is handled both directly by the Extension Layer and through the backend for session tracking.
- **Responses (Purple)**: External services return AI-generated responses and task data to the Flask backend, which then sends results to the Extension Layer for user presentation.

**Authentication**: When users log in through the Extension Layer, a login request is sent to Supabase’s OAuth service. Supabase manages GitHub OAuth authentication and returns an Auth Token to the user, which is then used for secure API requests to the Flask backend.

**External Services** (Black square boxes with icons):
- **Gemini API**: Provides AI capabilities for intelligent assistance
- **Jira API**: Integrates project management and issue tracking
- **Live Share Tracking**: Enables real-time collaborative editing with dual-path integration (direct Extension Layer connection and Flask backend session tracking)

**Data Storage**: The Supabase PostgreSQL Database stores all persistent data, including user profiles, teams, team configurations, Jira integrations, activity logs, and session information.
