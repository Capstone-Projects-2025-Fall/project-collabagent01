<div align="center">



# Collab Agent 01
[![Report Issue on Jira](https://img.shields.io/badge/Report%20Issues-Jira-0052CC?style=flat&logo=jira-software)](https://temple-cis-projects-in-cs.atlassian.net/jira/software/c/projects/DT/issues)
[![Deploy Docs](https://github.com/ApplebaumIan/tu-cis-4398-docs-template/actions/workflows/deploy.yml/badge.svg)](https://github.com/ApplebaumIan/tu-cis-4398-docs-template/actions/workflows/deploy.yml)
[![Documentation Website Link](https://img.shields.io/badge/-Documentation%20Website-brightgreen)](https://capstone-projects-2025-fall.github.io/project-collabagent01/)

</div>

## Keywords

`VS Code Extension` • `Team Collaboration` • `AI Suggestions` • `GitHub Integration` • `Jira Integration` • `Real-time Collaboration`

## Project Abstract

**CollabAgent** is a VS Code extension built to make team collaboration easier. Whether you're a beginner working on your first group project or a professional developer on a team assignment, CollabAgent uses AI to help you coordinate better with your teammates. The extension automatically tracks what everyone is working on by taking snapshots of local changes and displaying them in a shared timeline with AI-generated summaries. It can suggest which team member should work on which Jira tasks based on their user profile, and it lets you manage Jira tasks without leaving your editor. If you've ever struggled to keep track of what your team is doing or felt out of sync with your project, CollabAgent helps solve that problem.

## High Level Requirement

CollabAgent helps teams work together more effectively by providing:

- **Real-Time Collaboration** - Work together on the same code simultaneously using VS Code Live Share integration
- **Automatic Activity Tracking** - Captures snapshots of what each team member is working on locally without manual updates
- **AI-Generated Summaries** - Converts code changes into readable summaries so everyone understands what's happening
- **Shared Team Timeline** - Shows all team activity in one place so you know who's working on what
- **Smart Task Suggestions** - Uses AI to recommend which team member should handle specific tasks based on their profile
- **Integrated Task Management** - View and manage Jira tasks directly in VS Code without switching tools
- **Simple GitHub Authentication** - Quick sign-in with your GitHub account to get started

## Conceptual Design

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Extension Framework** | VS Code Extension API |
| **Frontend (Extension)** | TypeScript |
| **UI (Webviews)** | HTML/CSS/JavaScript |
| **Backend Framework** | Flask |
| **Language (Server)** | Python |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | GitHub OAuth |
| **AI Service** | Google Gemini API |

## Background

Most collaboration tools focus on real-time editing but overlook team awareness outside of active sessions. Live Share enables developers to co-edit code in real time, but it doesn't summarize activity or provide context once the session ends. CollabAgent fills this gap by automatically capturing snapshots of local work and using AI to generate summaries, keeping teammates aligned whether they're coding live or working asynchronously.

### Comparison to Existing Solutions

**Similar Projects:**
- **VS Code Live Share** - Great for real-time collaboration, but doesn't track what happens after the session ends or provide AI summaries of changes
- **CodeTogether** - Focuses on pair programming sessions without broader team activity tracking or task management

**What Makes CollabAgent Different:**
- **Persistent Team Awareness** - Automatically tracks and summarizes all team member activity, not just during live sessions
- **AI-Generated Context** - Converts code changes into readable summaries, eliminating the need to dig through diffs to understand teammates' code
- **Built-in Task Management** - Manage Jira tasks without leaving your editor
- **Smart Suggestions** - AI recommends Jira task assignments based on strengths listed in user profiles.
- **Timeline View** - See what everyone's working on in one shared timeline and get AI suggestions in the timline to improve team collaboration

## Required Resources

To develop or deploy CollabAgent, you'll need the following:

### Development Tools

- **Visual Studio Code** - Latest version recommended for extension development
- **Git** - For version control and cloning the repository
- **Node.js** - v16 or higher (required for compiling the TypeScript extension, NOT for the backend)
- **Python 3.8+** - For running the Flask backend server

### External Services & API Keys

- **GitHub Account** - Required for OAuth authentication and repository access
- **Google Gemini API Key** - For AI-powered features (code summaries, task suggestions)
- **Supabase Account** - Free tier works; provides PostgreSQL database and authentication services
- **Jira Account** - Optional, for Jira task integration features

### Additional Requirements

- **VS Code Live Share** - For testing real-time collaboration features
- **Internet Connection** - Required for OAuth, database access, and AI features

## Getting Started with Collab Agent 01

This guide will walk you through installing the extension from the VS Code Marketplace and logging in with your GitHub account.

---

### Step 1: Install the Extension

1. **Launch Visual Studio Code**

2. **Open Extensions Panel**
   - Click the Extensions icon in the Activity Bar (left sidebar)
   - Or press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)

3. **Search for Extension**
   - Type `Collab Agent 01` in the search bar

4. **Install**
   - Find the extension in the search results
   - Verify you're installing the correct version (e.g., version 0.5.0 or later)
   - Click the blue **Install** button

5. **Access Extension**
   - Look for the Collab Agent 01 icon (three people) in the Activity Bar
   - Click to open the extension panel

---

### Step 2: Sign In with GitHub

> **Note:** Email login is currently not working. Please use GitHub authentication.

1. **Open Extension Panel**
   - Click the Collab Agent 01 icon in the Activity Bar

2. **Start Sign In**
   - Find and click the **"Sign Up/Login"** button
   - Choose **"Sign In"** (not "Sign Up")

3. **Authenticate with GitHub**
   - Click **"Sign In with GitHub"**
   - VS Code will ask permission to open an external website → Click **Open**

4. **Authorize on GitHub**
   - Your browser will open to GitHub's authorization page
   - Click the green **Authorize** button

5. **Complete Authorization**
   - Browser popup: "This site is trying to open Visual Studio Code" → Click **Open**
   - VS Code prompt: "Allow 'Collab Agent 01' extension to open this URI?" → Click **Open**

You are now successfully logged in to the extension.

--- 

### Step 3: Learn How to Use the Extension

**For peer reviewers and users who want to learn more about using the extension:**

To understand what to expect when using the extension and learn about all available features, please follow the steps below

1. Visit the [Documentation Website](https://capstone-projects-2025-fall.github.io/project-collabagent01/)

2. Click **"Documentation"** in the top-left navigation menu

3. Navigate to **"Test Procedure"**

4. Select **"Acceptance Test"**

This section provides detailed instructions on how to use each feature, what to expect when clicking different buttons, and step-by-step guidance for testing the extension.

---

## Collaborators
<div align="center">

[//]: # (Replace with your collaborators)
[Alphin Shajan](https://github.com/alphin-08) • [Andrew Rush](https://github.com/tuj55961) • [Nicholas Phillips](https://github.com/vidderr) • [Jaryn Hernandez](https://github.com/JaHe03) • [Benjamin Shawn O'Neill](https://github.com/Ben-O1) • [Ian Tyler Applebaum](https://github.com/ApplebaumIan) • [Kyle Dragon Lee](https://github.com/leekd99)

</div>
