---
sidebar_position: 1
description: What should be in this section.
---

Design Document - Part II API
=============================

## Purpose
-◦ This Design Document gives the complete design of the software implementation. This information should be in structured comments (e.g. Javadoc) in the source files. We encourage the use of a documentation generation tool to generate a draft of your API that you can augment to include the following details.

---

## 1. Class: CollabAgentPanelProvider (views/CollabAgentPanel.ts)

#### **Purpose:**

-◦ This class controls the Collab Agent sidebar inside VS Code. It creates the panel, shows the interface, and keeps it updated with Live Share info.
   It also handles how the panel talks to the rest of the extension (sending and receiving messages).


#### **Data Fields**

`extensionUri` (*vscode.Uri*) -  main folder where the extension’s files are stored, it helps the panel find things like its HTML, CSS, and scripts

`context` (*vscode.ExtensionContext*) - keeps track of what the extension is doing and stores small bits of info between uses, helps the extension remember things or clean up when closed.

`viewType` (*collabAgent.teamActivity*) - A special name that VS Code uses to tell panels apart, It’s like this panel’s “ID tag


---

#### **Constructor**

`constructor (_extensionUri: Uri, _context: ExtensionContext)`

##### **Purpose:**

Starts up a new panel manager and gets it ready to show the sidebar.

##### **Parameters:**

- `extensionUri`: The main folder of the extension.

- `context`: The extension’s “memory”, keeps track of state and events.

##### **Returns:**

- A working CollabAgentPanelProvider ready to use.

##### **Before it runs (Pre-conditions):**

- The extension must already be active.

- You must give it a valid URI and context.

##### **After it runs (Post-conditions):**

- The provider is ready to make the sidebar panel appear.

##### **Errors:**

- If something’s wrong with the inputs, it throws an error saying the data is invalid.

---
## Method: 
### resolveWebviewView ()
- resolveWebviewView (webviewView, context, _token)

##### **Purpose:**

- Runs when the sidebar panel shows up. Also, builds the HTML page, connects buttons and messages, and starts Live Share.

##### **Parameters:**

- webviewView: The panel that will show the page.

- context: Info about how and where the panel is being created.

- token: A cancel switch (not used here).

##### **Returns:**

- Nothing right away, but finishes setting up everything (Promise<void>).

### updateTeamActivity ()
- updateTeamActivity (activity)

##### **Purpose:**

- Updates the sidebar to show what people on your team are doing (like who’s editing what).

##### **Parameters:**

- activity: Info about what happened, like edits or status updates.

##### **Returns:**

- Nothing (void)

### dispose ()
- dispose()

##### **Purpose:**

- Cleans up everything when the sidebar panel closes. Stops timers, removes event listeners, and frees up memory.

##### **Returns:**

- Nothing (void)

---
## 2. Class: OAuth (api/auth-api.ts)

## Methods:

##### **signIn**

`signIn(email: string, password: string): Promise<{ token?: string; error?: string }>`

##### **Purpose:**
Logs a user into the system using their email and password.

Sends a POST request to the authentication endpoint to check if the credentials are valid.

##### **Parameters:**

`email (string)` - The user’s email address.

`password (string)` - The user’s password.

##### **Returns:**

Promise<{ token?: string; error?: string }> - Returns an object that includes either, a token when the login is successful, or an error message if the login fails.


##### **signOut**

signOut(userID: string): Promise<{ error?: string }>

##### **Purpose:**
Logs a user out by ending their session on the backend.
Sends a POST request to the signout endpoint with the user’s unique ID.

##### **Parameters:**
`userID (string)` - The ID of the user to sign out.

##### **Returns:**
Promise<{ error?: string }> - Returns an object indicating success or containing an error message if something goes wrong.

##### **signUp**

signUp(email: string, password: string, firstName: string, lastName: string): Promise<{ token?: string; error?: string }>

##### **Purpose:**
Registers a new user account using their email, password, and name.
Sends a POST request to the signup endpoint to create the account.

##### **Parameters:**

`email (string)` - The user’s email address.

`password (string)` - The user’s chosen password.

`firstName (string)` - The user’s first name.

`lastName (string)` - The user’s last name.

##### **Returns:**

Promise<{ token?: string; error?: string }> - Returns an object that includes either: a token when registration is successful, or
an error message if registration fails.

---
## 3. Class: Supabase (auth/supabaseClient.ts)

## Methods:
##### **getSupabase**

getSupabase(): SupabaseClient

##### **Purpose:**

Creates or retrieves a Supabase client instance for handling authentication and database actions.
It reads the configuration from VS Code settings or environment variables to connect properly.

##### **Returns:**

SupabaseClient - The initialized Supabase client instance ready for use.

##### Throws:

Error - If the Supabase configuration (URL or API key) is missing or invalid.



##### **getCurrentUser**

getCurrentUser(): Promise<null | User>

##### **Purpose:**
Fetches the currently signed-in user from Supabase.
Used to check authentication status or retrieve the user’s profile information.

##### **Returns:**

Promise<null | User> - Resolves with the current user object if authenticated, or null if no user is signed in.

---

## 4. Collab Agent REST API Endpoints

##### **Purpose:**

The Collab Agent extension connects to a Flask backend through several REST API endpoints.
These endpoints handle authentication, user management, and Live Share session activity.

#### **Authentication Endpoints**

POST /auth/login?provider=email

##### **Purpose:**
Logs a user into Collab Agent using their email and password.

##### **Request Details:**

Method: POST

URL: {BASE_URL}/auth/login?provider=email

#### **User Management Endpoints**

GET /users/{userID}

##### **Purpose:**
Fetches user information to track Live Share participants.

##### **Request Details:**

Method: GET

URL: {BASE_URL}/users/{userID}

---
PUT /users/{userID}/status

##### **Purpose:**
Updates a user’s activity status during a Live Share session.

##### **Request Details:**

Method: PUT

URL: {BASE_URL}/users/{userID}/status

---



