---
sidebar_position: 5
---

# Use-case descriptions

## Use Case 1 – Pair Programming with AI in a VS Code Team

Story:
Alex and Jamie are working on a group project in VS Code. They’re both in the same team in the Collab Agent system.

Step-by-step:
1. Sign in to the extension
Alex opens VS Code, installs the Collab Agent extension, and signs in with their student email. The extension stores their auth context and associates them with Team Alpha.

2. Start coding as usual
Alex edits auth-service.ts and file-snapshot-service.ts. Every time they make meaningful changes, the extension creates a file snapshot (file path, snapshot content, change summary, timestamp).

3. Snapshots are synced to Supabase
The extension calls addFileSnapshot, resolving Alex’s Supabase auth user ID and active team from the global context. Each snapshot is inserted into the file_snapshots table with user_id, team_id, and file info.

4. Jamie joins the project later
Jamie pulls the repo, opens VS Code with the same extension, and signs in. Their snapshots also get tied to Team Alpha, but with their own user ID.

5. The team views AI-powered insights
A dashboard or panel (webview / external UI) reads the snapshot data from Supabase and feeds it into an AI backend. It can now show:
   * Who’s been working on which files
   * Recent risky changes or error-prone zones
   * Suggested refactors or tests to add

6. Alex and Jamie adjust based on feedback
They see that their auth flow is repeatedly changed and flagged as “high risk.” They decide to refactor together and rely on the AI suggestions to clean it up.

Outcome:
Without changing their normal workflow, the team gets automatic, AI-enhanced visibility into project progress and risk, driven entirely by snapshots captured from VS Code.

### Sequence Diagram:
<img width="1250" height="912" alt="Screenshot 2025-12-02 182001" src="https://github.com/user-attachments/assets/b9b2bd35-04f1-4290-a6d4-5080938bfcd1" />


## Use Case 2 — Professor Uses Snapshot Summaries to Guide Taylor

Story:
Taylor is working on a solo project in his computer science class, and the instructor needs a way to find out what Taylor has been working on and where he is struggling so they can provide proper feedback.

Step-by-step:
1. Taylor is a student working on their course project in VS Code using the Collab Agent extension. As Taylor edits files—fixing functions, adding API calls, and experimenting with logic—the extension automatically captures snapshots of each save and quietly sends them to Supabase.

2. Later in the week, Professor Lee logs into the course dashboard to monitor student progress. For each student, the dashboard shows AI-generated summaries built from the collected snapshots (patterns, common errors, unfinished work, or signs of confusion).

3. When reviewing Taylor’s summaries, Professor Lee notices recurring themes: Taylor repeatedly changes input validation logic and keeps adjusting error handling around the same API route. The summary indicates uncertainty about correct parameter usage.

4. During office hours, Professor Lee uses these insights to guide Taylor:
   * “I saw you’ve been re-working the validation in user-api.ts. Let’s walk through how the request schema should look.”
   * “It looks like you might be having trouble with error propagation—want to revisit how we structure our service responses?”

Outcome:
Taylor now gets targeted help, and the extension never needed direct feedback features—everything happened through snapshots → summaries → instructor insight.

### Sequence Diagram:
<img width="1258" height="727" alt="Screenshot 2025-12-02 183829" src="https://github.com/user-attachments/assets/12a48a76-92a6-490b-a954-5c6ca0e7a680" />


## Use Case 3 – Instructor/Team Lead Reviewing Real Contribution & Activity

Story:
Professor Lee wants to know how each member of Team Beta is contributing to their final project, without digging through Git logs manually.

Step-by-step:
1. Students work as usual
Each team member (Sam, Jordan, and Priya) works locally in VS Code with the extension installed. They’re all signed in and associated with Team Beta via collabAgent.currentTeam.

2. Snapshots build a contribution timeline
As they work:
   * Every significant change to files produces a snapshot.
   * Each snapshot is stored in Supabase with user_id, team_id, file path, timestamp, and change summary.

3. Professor Lee opens the instructor dashboard
A web/dashboard view queries the file_snapshots table grouped by team_id and user_id. It displays:
   * Number of snapshots per user
   * Files touched by each member
   * Recent activity windows (e.g., last 24–72 hours)

4. Patterns emerge clearly
The dashboard reveals:
   * Sam: many snapshots on backend services
   * Jordan: mostly UI files and styling
   * Priya: sparse activity overall, very few snapshots

5. Professor Lee drills into details
They click on Priya’s timeline to view detailed snapshot info — file paths, timestamps, and diffs. It’s obvious Priya joined late or isn’t contributing evenly.

6. Actionable next steps
Professor Lee can:
   * Talk to the team about workload balance
   * Offer support to Priya
   * Use snapshot data as part of grading or participation rubrics

Outcome:
The extension gives instructors/team leads objective, fine-grained visibility into who did what and when, using the snapshot system rather than relying on guesswork.

### Sequence Diagram:
<img width="1148" height="794" alt="Screenshot 2025-12-02 182150" src="https://github.com/user-attachments/assets/559d595b-4f47-4a42-a1bd-6eaf15b176ff" />
