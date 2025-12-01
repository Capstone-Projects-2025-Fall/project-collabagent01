---
sidebar_position: 3
---
# Acceptance test

## SignIn/SignOut

| ID | Scenario                        | Action                                               | Expected Result                                 |
|----|----------------------------------|------------------------------------------------------|-------------------------------------------------|
| 1  | Signing In              | User selects the "Sign Up/Login" button, then clicks "Sign In", then "Sign In with GitHub"| VS Code will ask to open external website|
| 2  | Signing In Pt2             | User clicks "Open"| Web browser will open to a GitHub authorization page|
| 3  | Signing In Pt3             | User clicks the green Authorize button| You get a pop up saying "This site is trying to open Visual Studio Code"|
| 4  | Signing In Pt4             | User clicks "Open" and goes back to VS Code| VS Code will show one last confirmation: "Allow 'Collab Agent 01' extension to open this URI?|
| 5  | Signing In Pt5             | User clicks "Open"| You have sucessfully logged in!|
| 6  | Signing Out                 | User clicks the red "Sign Out" button at the bottom right | User successfully signs out    |

---

## Account Management

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 7  | Setting up Profile          | User clicks the "Profile" tab and enters name & their interests + strengths & clicks "Save Profile" button | User gets a "Profile Saved Successfully!" messsage|
| 8  | Clearing Selected Skills   | User clicks "Clear" button  | All selected interests & strengths gets cleared|
| 9  | Deleting Account | User clicks "Delete Account" button | A pop up appears to confirm this decision |
| 10  | Deleting Account Pt2 | User types out "DELETE" in the input box & clicks "Delete My Account" button | Completely removes the whole account from our database |
| 11  | Canceling Delete | User selects "Delete Account" button but then clicks "Cancel" button when the pop up appears | Pop up just closes and your account remains |

---

## Connecting to Jira (Admin Only)

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 12  | Instructions on Getting Jira API Token    | User clicks "How do I get an API token?" link | A pop up appears with instructions|
| 13  | Connect to Jira (Admin Only) | User opens "Tasks" panel and fills out all required fields & clicks "Connect to Jira" button | A drop down from top of Vs Code appears asking to select a project board |
| 14  | Connect to Jira (Admin Only) Pt2 | User selects a project board from the drop down menu | User gets a success message & jira board is connected |
| 15 | Disconnecting from Jira (Admin Only) | User clicks the red "Disconnect" button| User gets a pop up asking "Are you sure you want to disconnect?"|
| 16 | Disconnecting from Jira Pt2 (Admin Only) | User clicks "Disconnect" on the pop up | Jira board gets diconnected and user is taken back to the initial setup page |

---

## Tasks

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 17  | Filter based on "Issues", "Statuses", & "Assignees" | User choose an option from any of those filter options  | It successfully filters the displayed Jira Tasks|
| 18  | Creating a Task     | User clicks "Create Task" | A pop up appears to input task information|
| 19  | Creating a Task Pt2 | User fills in the input fields & clicks "Create Task" button | It creates a task in the Jira Board (Can also be seen in the Jira web browser)|
| 20  | Moving Status of Task | User clicks "START' button on a task labeled as "TO DO" | It changes the status of the task from "TO DO" to "IN PROGRESS" (even in the Jira web browser)|
| 21  | Moving Status of Task | User clicks "COMPLETE' button on a task labeled as "IN PROGRESS" | It changes the status of the task from "IN PROGRESS" to "DONE" (even in the Jira web browser) |
| 22  | Getting AI Suggestions | Once users profile is setup and user clicks "Get AI Suggestions" button | User gets a "Analyzing Unassigned Tasks" notification on the bottom right, gets a "Analyzing" loading button, gets "AI posted # task recommendations..."  |
| 23  | Getting AI Suggestions Pt2 | User switches over to the "Team" tab and clicks the "Refresh" button under the "Team Activity Timeline" | User sees AI recommendations on who the unassigned tasks should be assigned to |
| 24  | Getting AI Suggestions Pt3 | User clicks on of the events labeled as "Task Delegation" in the Team Activity Timeline & clicks "View Reason" button | Displays AI's reason for this recommendation |

---

## Collaborate (Live Share)

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 25  | Hosting a Session          | User opens a project folder, clicks "Start Session" button         | Session link is automatically copied to clipboard & can be shared with anyone|
| 26  | Session Monitoring     | No action needed  | An automatic snapshot is taken of the current repo & displayed in the Team Activity Timeline under the event labeled as "Started Live Share"|
| 27  | Session Monitoring Pt2     | User clicks on the event labeled as "Started Live Share" & clicks "View Initial Snapshot" button  | A panel appears with all their current files and code|
| 28  | Joining a Session       | User clicks "Join Session" button and pastes the invite link | User has successfully joined the session|
| 29  | Real Time Collaboration | User goes to the project folder | User gets access to host's project folder and live editing is enabled (You can see changes in real time)|
| 30  | Leaving a Session | Only members can leave a session and they do it by clicking the "Leave Session" button | It successfully removes you from the session |
| 31 | Ending a Session | Only host can end a session and they do it by clicking the "End Session" button | Successfully ends the session, kicks everyone out, and the panel goes back to the initial state |
| 32 | Ending Session Results | No action need | A new event called "Ended Live Share" appears in the Team Activty Timeline |
| 33 | Ending Session Results Pt2 | User clicks on the event labeled as "Ended Live Share" & clicks "View Changes" button  | A panel appears with all their changes that were made during the session |
| 34 | Ending Session Results Pt3 | User clicks on the event labeled as "Ended Live Share" & clicks "View Summary" button  | A panel appears with an AI generated summary of the changes|
---

## Team

| ID | Scenario                        | Action                                               | Expected Result                                 |
|----|----------------------------------|------------------------------------------------------|-------------------------------------------------|
| 35  | Creating a Team                | User opens up a Git repo & selects the "Create Team" button | Lobby is created and a 6-digit code is generated and presented on the panel|
| 36  | Joining a Team                 | User opens repo associated with the Team, selects the "Join Team" button & enters the 6-digit code | User successfully joins existing Team    |
| 37  | Viewing Team Members       | User clicks "Team Members" button under "Team Management" | It will list all team members of the current team along with their skills & role |
| 38  | Switching a Team       | User opens the correct project folder associated with the team, clicks switch team, then selects the team they want to switch into| User successfully switches teams & an initial snapshot of repo is captured (more on this in the table below)|
| 39  | Switching to Wrong Team      | User has project folder A opened, but tries to switch to Team B | User gets an error message saying to open the correct project folder (Project B) associated with the Team|
| 40  | Leaving a Team      | User clicks "Leave Team" button | A pop appears to confirm this action|
| 41  | Leaving a Team Pt2     | User clicks "Yes, Leave" button | User has successfully left the team|

---

## Async Collaboration

| ID | Scenario                        | Action                                               | Expected Result                                 |
|----|----------------------------------|------------------------------------------------------|-------------------------------------------------|
| 42  | Trigger Async Collaboration     |Clicks switch team button and choose a team | An automatic initial snapshot of the current repo is taken|
| 44  | Async Collaboration   | User checks Team Activity Timeline, clicks on the event labeled as "Initial Snapshot" & clicks "View Initial Snapshot" | A panel appears with all their current files and code |
| 45  | Async Collaboration Pt2   | User makes 50+ line changes to any files & waits 20 seconds (be inactive) | An automatic snapshot is taken again with a notification "Snapshot sent to AI for analysis"  |
| 46  | Async Collaboration Pt3   | User heads over to Team Activity Timeline, clicks on the "Changes" event & clicks "View Changes" button | A panel appears with their recent code changes |
| 47  | Async Collaboration Pt4   |  User heads over to Team Activity Timeline, clicks on the "Changes" event & clicks "View Summary" button| A panel appears with an AI generated summary of the changes |

