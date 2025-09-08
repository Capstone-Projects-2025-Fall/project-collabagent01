---
sidebar_position: 1
---

# System Overview

# Project Abstract
This project aims to develop a real-time collaborative coding platform that brings Google Docs style into the IDE. Instead of waiting on commits and pull requests, our product allows developers to edit code at the same time, with changes instantly reflected across all members' IDEs. In addition, an integrated sidebar powered by an Agent Bot will provide team info by displaying which files teammates are working on and what tasks they are focused on. Users will also have the option to update their status in the sidebar manually. These features will make it easier to work together, cut down on extra talking, and stop people from doing the same work twice. We’re taking inspiration from Microsoft’s “Live Share” extension 

# Conceptual Design
The frontend extension will be built with JavaScript and React to provide Google Docs style live editing and a sidebar that displays members' file activity and task updates. We will also be using the Live Share API to handle session control. We will be using some sort of Python framework, like Django or FastAPI, to handle backend authentication.

# Background
Some similar products that are currently out there are "Live Share" by VS Code and "Clover" by HCI Lab. Live Share allows developers to co-edit, co-debug, and share terminals in real time. Clover is an AI-powered code assistant similar to GitHub Copilot, but with an educational focus. Our proposed system shares the real-time synchronization and chatbot from both products. This allows to create a reduced need for constant communication.
