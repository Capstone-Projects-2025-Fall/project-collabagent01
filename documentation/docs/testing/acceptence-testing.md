---
sidebar_position: 3
---
# Acceptance test

## SignUp

| ID | Scenario                        | Action                                               | Expected Result                                 |
|----|----------------------------------|------------------------------------------------------|-------------------------------------------------|
| 1  | Signing In              | User selects the "Sign Up/Login" button, then clicks "Sign In", then "Sign In with GitHub"| VS Code will ask to open external website|
| 2  | Signing In Pt2             | User clicks "Open"| Web browser will open to a GitHub authorization page|
| 3  | Signing In Pt3             | User clicks the green Authorize button| You get a pop up saying "This site is trying to open Visual Studio Code"|
| 4  | Signing In Pt4             | User clicks "Open" and goes back to VS Code| VS Code will show one last confirmation: "Allow 'Collab Agent 01' extension to open this URI?|
| 5  | Signing In Pt5             | User clicks "Open"| You have sucessfully logged in!|
| 6  | Signing Out                 | User clicks the red "Sign Out" button at the bottom right | User successfully signs out    |

---

## Live Share

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
| 14  | Switching a Team       | User opens the correct project folder associated with the team, clicks switch team, then selects the team they want to switch into| User successfully switched teams|
| 15  | Switching to Wrong Team      | User has project folder A opened, but tries to switch to Team B | User gets an error message saying to open the correct project folder (Project B) associated with the Team|

---

## Our AI features are currently in progress, and so it has not been added to our release, so there is nothing to test regarding that! Thank you for all the feedback!

