---
sidebar_position: 1
description: What should be in this section.
---

Design Document - Part II API
=============================

## Purpose
This Design Document gives the complete design of the software implementation. This information should be in structured comments (e.g. Javadoc) in the source files. We encourage the use of a documentation generation tool to generate a draft of your API that you can augment to include the following details.

---

## 1. Class: CollabAgentPanelProvider (views/CollabAgentPanel.ts)

### **Purpose:**

-◦ This class controls the Collab Agent sidebar inside VS Code.

-◦ It creates the panel, shows the interface, and keeps it updated with Live Share info.

-◦ It also handles how the panel talks to the rest of the extension (sending and receiving messages).


#### **Data Fields**


- 'extensionUri' (*vscode.Uri*) -  main folder where the extension’s files are stored, it helps the panel find things like its HTML, CSS, and scripts

- 'context' (*vscode.ExtensionContext*) - keeps track of what the extension is doing and stores small bits of info between uses, helps the extension remember things or clean up when closed.

- 'viewType' (*collabAgent.teamActivity*) - A special name that VS Code uses to tell panels apart, It’s like this panel’s “ID tag


---

#### **Constructor**

- constructor(_extensionUri: Uri, _context: ExtensionContext)

**Purpose:**

Starts up a new panel manager and gets it ready to show the sidebar.

**Parameters:**

- 'extensionUri': The main folder of the extension.

- 'context': The extension’s “memory”, keeps track of state and events.

**Returns:**

- A working CollabAgentPanelProvider ready to use.

**Before it runs (Pre-conditions):**

- The extension must already be active.

- You must give it a valid URI and context.

**After it runs (Post-conditions):**

- The provider is ready to make the sidebar panel appear.

**Errors:**

- If something’s wrong with the inputs, it throws an error saying the data is invalid.

---
## Method: 
## resolveWebviewView
- resolveWebviewView(webviewView, context, _token)

**Purpose:**

- Runs when the sidebar panel shows up. Also, builds the HTML page, connects buttons and messages, and starts Live Share.

**Parameters:**

- webviewView: The panel that will show the page.

- context: Info about how and where the panel is being created.

- token: A cancel switch (not used here).

**Returns:**

- Nothing right away, but finishes setting up everything (Promise<void>).

## updateTeamActivity
- updateTeamActivity(activity)

**Purpose:**

- Updates the sidebar to show what people on your team are doing (like who’s editing what).

**Parameters:**

- activity: Info about what happened, like edits or status updates.

**Returns:**

- Nothing (void)

## dispose
- dispose()

**Purpose:**

- Cleans up everything when the sidebar panel closes. Stops timers, removes event listeners, and frees up memory.

**Returns:**

- Nothing (void)



