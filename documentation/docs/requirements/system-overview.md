---
sidebar_position: 1
---

# System Overview

# Project Abstract
CollabAgent is an AI Agent Bot extension for collaborative coding that helps teams stay aligned with meaningful updates. It works in two modes: async, where the Agent creates commit-based summaries powered by Gemini or ChatGPT, and sync, where Live Share provides real-time co-editing and file sharing. The Agent remains usable in both modes, giving teams filtered, human-readable updates without noise or constant monitoring. By combining commit summaries, real-time editing, and on-demand insights, CollabAgent reduces duplicate work and improves team awareness.


# Conceptual Design
CollabAgent is a VS Code extension with an Agent-first design, supported by Live Share for real-time collaboration. In async mode, the Agent generates commit-based summaries that filter out noisy files and trigger only when meaningful thresholds are met, keeping updates clear and useful. In sync mode, teams co-edit via Live Share while the Agent remains available on demand, and teammates can request instant summaries, explanations, or status notes. A lightweight sidebar lets users declare what they’re working on so others have near real-time awareness between commits. The frontend uses React for the sidebar experience, and the backend uses Flask to handle auth, filtering, and summary orchestration. The Agent’s intelligence is powered by Gemini or ChatGPT, producing concise, human-readable activity recaps. Together, these components reduce duplicate work, improve awareness, and keep teams aligned whether they’re collaborating live or asynchronously.

# Background
Most collaboration tools focus on real-time editing but overlook team awareness outside of active sessions. Live Share enables developers to co-edit code in real time, but it does not summarize activity or provide context once the session ends. CollabAgent builds on this gap by taking an Agent-first approach, using commit-based summaries and on-demand insights to keep teammates aligned whether they are coding live or asynchronously.
