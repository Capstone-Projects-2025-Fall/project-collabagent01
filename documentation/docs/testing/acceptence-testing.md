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
| 7  | Setting up Profile          | User clicks the "Profile" tab and enters name & their interests + strengths & clicks "Save Profile" button | User gets a "Profile Saved Successfully" messsage|
| 8  | Clearing Selected Skills   | User clicks "Clear" button  | All selected interests & strengths get cleared|
| 9  | Deleting Account | User clicks "Delete Account" button | A pop up appears to confirm this decision |
| 10  | Deleting Account Pt2 | User types out "DELETE" in the input box & clicks "Delete My Account" button | Completely removes the whole account from our database |
| 11  | Canceling Delete | User selects "Delete Account" button but then clicks "Cancel" button when the pop up appears | Pop up just closes and your account remains |

---

## Connecting to Jira

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 12  | Hosting a Session          | User opens a project folder, clicks "Start Session" button         | Session link is automatically copied to clipboard & can be shared with anyone|
| 13  | Joining a Session       | User clicks "Join Session" button and pastes the invite link | User has successfully joined the session|
| 14  | Real Time Collaboration | User goes to the project folder | User gets access to host's project folder and live editing is enabled (You can see changes in real time)|
| 15  | Leaving a Session | Only members can leave a session and they do it by clicking the "Leave Session" button | It successfully removes you from the session |
| 16 | Ending a Session | Only host can end a session and they do it by clicking the "End Session" button | Successfully ends the session, kicks everyone out, and the panel goes back to the initial state |

---

## Tasks

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 12  | Filter based on "Issues", "Statuses", & "Assignees" | User choose an option from any of those filter options         | It successfully filters the displayed Jira Tasks|
| 13  | Creating a Task     | User clicks "Create Task" | A pop up appears to input task information|
| 14  | Creating a Task Pt2 | User fills in the input fields & clicks "Create Task" button | It creates a task in the Jira Board (Can also be seen in the Jira web browser)|
| 14  | Moving Status of Task | User clicks "START' button on a task labeled as "TO DO" | It changes the status of the task from "TO DO" to "IN PROGRESS"|
| 14  | Moving Status of Task | User clicks "COMPLETE' button on a task labeled as "IN PROGRESS" | It changes the status of the task from "IN PROGRESS" to "DONE"|
| 15  | Getting AI Suggestions | Once user profile is setup and user clicks "Get AI Suggestions" button | User gets a "Analyzing Unassigned Tasks" notification on the bottom right then ... |
| 15  | Getting AI Suggestions Pt2 | User switches over to the "Team" tab and clicks the "Refresh" button under the "Team Activity Timeline" | User sees AI offered recommendations for distributing the unassigned tasks among team members. |
| 15  | Getting AI Suggestions Pt3 | User clicks on of the events labeled as "Task Delegation" & clicks "View Reason" button | Displays AI's reason for this recommendation |

---

## Collaborate (Live Share)

| ID | Scenario                  | Action                                              | Expected Result                                    |
|----|---------------------------|-----------------------------------------------------|----------------------------------------------------|
| 7  | Hosting a Session          | User opens a project folder, clicks "Start Session" button         | Session link is automatically copied to clipboard & can be shared with anyone|
| 8  | Joining a Session       | User clicks "Join Session" button and pastes the invite link | User has successfully joined the session|
| 9  | Real Time Collaboration | User goes to the project folder | User gets access to host's project folder and live editing is enabled (You can see changes in real time)|
| 10  | Leaving a Session | Only members can leave a session and they do it by clicking the "Leave Session" button | It successfully removes you from the session |
| 11 | Ending a Session | Only host can end a session and they do it by clicking the "End Session" button | Successfully ends the session, kicks everyone out, and the panel goes back to the initial state |

---

## Team

| ID | Scenario                        | Action                                               | Expected Result                                 |
|----|----------------------------------|------------------------------------------------------|-------------------------------------------------|
| 12  | Creating a Team                | User opens up a Git repo & selects the "Create Team" button | Lobby is created and a 6-digit code is generated and presented on the panel|
| 13  | Joining a Team                 | User opens the same Git repo, selects the "Join Team" button & enters the 6-digit code | User successfully joins existing Team    |
| 14  | Viewing Team Members       | User clicks "Team Members" drop down button under "Team Management" | It will list all team members of the current team along with their skills & role |
| 14  | Switching a Team       | User opens the correct project folder associated with the team, clicks switch team, then selects the team they want to switch into| User successfully switched teams|
| 15  | Switching to Wrong Team      | User has project folder A opened, but tries to switch to Team B | User gets an error message saying to open the correct project folder (Project B) associated with the Team|
| 15  | Leaving a Team      | User clicks "Leave Team" button | A pop appears to confirm this action|
| 15  | Leaving a Team Pt2     | User clicks "Yes, Leave" button | User has successfully left the team|

---

## Async Collaboration

| ID | Scenario                        | Action                                               | Expected Result                                 |
|----|----------------------------------|------------------------------------------------------|-------------------------------------------------|
| 12  | Creating a Team                | User opens up a Git repo & selects the "Create Team" button | Lobby is created and a 6-digit code is generated and presented on the panel|




