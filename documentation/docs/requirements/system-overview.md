---
sidebar_position: 1
---

# System Overview

# Project Abstract
CollabAgent is an AI-assisted collaboration tool built as a VS Code extension. It helps software development teams stay aware of ongoing work by providing summaries of code changes, surfacing Jira task information, and presenting recent team activity in a single place. The extension runs inside the editor and communicates with a backend service that analyzes code, retrieves project data, and generates context-aware insights. The main goal is to reduce the effort required to understand what is happening in the project and who is working on what, without forcing developers to leave their primary development environment.


# Conceptual Design
CollabAgent is designed around an Agent interface that lives inside VS Code. The frontend consists of  multiple tabs that display code summaries, Jira task details, user-specific recommendations, and a shared team activity timeline. When a user interacts with the extension, the Agent sends requests to a backend service. The backend coordinates code analysis, integrates with Jira to fetch and update task information, and calls AI models to generate natural language summaries.

A user profile component stores information about each developer’s skills and experience. This is used by the Agent to recommend tasks or areas of focus that align with the user’s strengths. The team activity timeline provides insights on code updates, task recommendations based on user skill, updates if users are working together, and more. Together, these provide a perspective on project state and individual contributions directly inside the editor.

# Background
Development teams often rely on several disconnected tools to stay informed, such as Git hosting platforms, Jira boards, and messaging applications. While these tools record activity, they do not always provide an integrated or summarized view of what is happening across the codebase and task tracker. Developers frequently need to switch contexts, open multiple dashboards, or ask teammates for verbal updates to understand current progress.

CollabAgent addresses this problem by placing an AI-assisted overview inside the editor itself. By combining code analysis, Jira task information, user skill profiles, and a unified activity timeline, the system aims to improve team awareness and reduce redundant communication, while still fitting into existing workflows.
