from flask import Blueprint, request, jsonify
import os, textwrap
import google.generativeai as genai
from ..database.db import sb_select, sb_insert

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

MODEL = os.getenv("MODEL", "gemini-2.5-flash")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(MODEL)

@ai_bp.post("/summarize")
def summarize():
    body = request.get_json(silent=True) or {}
    limit = str(body.get("limit", 50))
    order = body.get("order", "created_at.desc")

    rows = sb_select("notes", {
        "select":"id,title,body,created_at",
        "order": order,
        "limit": limit
    })
    if not rows:
        return jsonify({"summary":"No rows found.","meta":{"row_count":0}})

    # Build compact corpus (MVP guardrail at ~10k chars)
    total, lines = 0, []
    for r in rows:
        piece = f"• {r.get('title') or '(untitled)'}\n{(r.get('body') or '').strip()}\n"
        if total + len(piece) > 10000: break
        lines.append(piece); total += len(piece)
    corpus = "\n".join(lines)

    prompt = textwrap.dedent(f"""
      You are a technical code summarizer. Your task is to take the following details and create a summary that captures the crucial information in a semi-concise manner.
        1. The summary should be clear and easy to understand.
        2. Use bullet points or numbered lists where appropriate to enhance readability.
        3. Focus on the most important aspects and avoid unnecessary details.
        4. If a section changes significantly, provide a brief explanation of the changes.
      Keep concrete details (IDs, endpoints, filenames, counts).

      ENTRIES:
      {corpus}
    """).strip()

    resp = model.generate_content(prompt)
    return jsonify({
      "summary": (resp.text or "").strip() or "(no output)",
      "meta": {"row_count": len(rows), "model": MODEL}
    })


@ai_bp.post("/process_snapshot")
def process_snapshot():
  """
  Create an AI summary for a single file_snapshot and write it
  to team_activity_feed.
  """
  body = request.get_json(force=True)
  snapshot_id = (body or {}).get("snapshot_id")
  team_id = (body or {}).get("team_id")
  activity_type = (body or {}).get("activity_type", "ai_summary")
  max_chars = int((body or {}).get("max_chars", 4000))

  if not snapshot_id:
    return jsonify({
      "error": "snapshot_id is required"
    }), 400

  # 1) Load the snapshot row
  rows = sb_select("file_snapshots", {
    "select": "id,user_id,file_path,changes,updated_at",
    "id": f"eq.{snapshot_id}",
    "limit": "1"
  })
  if not rows:
    return jsonify({"error": "snapshot not found"}), 404

  snap = rows[0]
  diff = (snap.get("changes") or "").strip()
  file_path = snap.get("file_path") or "(unknown file)"
  user_id = snap.get("user_id")

  # If team_id not provided, try to infer from user's most recent membership
  if not team_id:
    memberships = sb_select("team_membership", {
      "select": "team_id,joined_at",
      "user_id": f"eq.{user_id}",
      "order": "joined_at.desc",
      "limit": "1"
    })
    if memberships:
      team_id = memberships[0].get("team_id")
    else:
      # fallback: a team the user created most recently
      teams = sb_select("teams", {
        "select": "id,created_at",
        "created_by": f"eq.{user_id}",
        "order": "created_at.desc",
        "limit": "1"
      })
      if teams:
        team_id = teams[0].get("id")

  if not team_id:
    return jsonify({
      "error": "Unable to infer team_id for this user; pass team_id explicitly."
    }), 400

  # Cap the prompt size for reliability
  if len(diff) > max_chars:
    diff = diff[:max_chars] + "\n... (truncated)"

  # 2) Ask the model for a short, plain summary
  prompt = textwrap.dedent(f"""
    You are summarizing a single code diff for an activity feed.
    Output one short sentence (<= 25 words), past tense, plain language,
    no code blocks. Mention the file when helpful.
    Examples: "Added array sum and mean utilities in src/utils/math.js".

    FILE: {file_path}
    DIFF:
    {diff}
  """).strip()

  try:
    resp = model.generate_content(prompt)
    summary = ((resp.text or "").strip()) or f"Updated {file_path}"
  except Exception as e:
    # Fall back to a deterministic message for demo resilience
    summary = f"Updated {file_path} (AI unavailable)"

  # 3) Insert into team_activity_feed
  feed_row = {
    "team_id": team_id,
    "user_id": user_id,
    "summary": summary,
    "file_path": file_path,
    "source_snapshot_id": snapshot_id,
    "activity_type": activity_type,
  }
  out = sb_insert("team_activity_feed", feed_row)

  return jsonify({
    "inserted": out,
    "summary": summary,
    "model": MODEL
  }), 201


@ai_bp.get("/feed")
def get_feed():
  """Return recent team activity feed rows for a team with changes from file_snapshots."""
  team_id = request.args.get("team_id")
  limit = request.args.get("limit", "20")
  if not team_id:
    return jsonify({"error": "team_id is required"}), 400

  # Select from team_activity_feed and join with file_snapshots to get changes
  # Include ai_summary column if it exists
  rows = sb_select("team_activity_feed", {
    "select": "id,team_id,user_id,summary,file_path,source_snapshot_id,activity_type,created_at,ai_summary,file_snapshots(changes)",
    "team_id": f"eq.{team_id}",
    "order": "created_at.desc",
    "limit": str(limit)
  })

  # Flatten the nested file_snapshots data
  for row in rows:
    if row.get("file_snapshots") and isinstance(row["file_snapshots"], dict):
      row["changes"] = row["file_snapshots"].get("changes")
    else:
      row["changes"] = None
    # Remove the nested object
    row.pop("file_snapshots", None)

  return jsonify(rows)


@ai_bp.post("/live_share_event")
def live_share_event():
  """
  Create an AI summary for a Live Share session event
  """
  body = request.get_json(force=True) or {}
  event_type = body.get("event_type")  # 'started' or 'ended'
  session_id = body.get("session_id")
  team_id = body.get("team_id")
  user_id = body.get("user_id")
  display_name = body.get("display_name", "Unknown User")
  duration_minutes = body.get("duration_minutes", 0)

  if not event_type or not team_id or not user_id:
    return jsonify({"error": "event_type, team_id, and user_id are required"}), 400

  # Handle session start event
  if event_type == "started":
    summary = f"{display_name} started hosting a Live Share session, join up and collaborate"
    activity_type = "live_share_started"

  # Handle session end event with AI-generated summary
  elif event_type == "ended":
    if not session_id:
      return jsonify({"error": "session_id is required for ended events"}), 400

    # Get participants from session_participants table
    participants = sb_select("session_participants", {
      "select": "github_username,peer_number",
      "session_id": f"eq.{session_id}",
      "order": "peer_number.asc"
    })

    # Build participant list (exclude host who is peer_number 1)
    teammates = [p.get("github_username") for p in participants if p.get("peer_number") != 1]
    teammates = [name for name in teammates if name]  # Filter out None values

    # Format duration
    if duration_minutes < 1:
      duration_str = "less than a minute"
    elif duration_minutes < 60:
      duration_str = f"{duration_minutes} minute{'s' if duration_minutes != 1 else ''}"
    else:
      hours = duration_minutes // 60
      mins = duration_minutes % 60
      duration_str = f"{hours} hour{'s' if hours != 1 else ''}"
      if mins > 0:
        duration_str += f" and {mins} minute{'s' if mins != 1 else ''}"

    # Use AI to create a natural summary
    if teammates:
      teammates_str = ", ".join(teammates[:-1]) + (" & " + teammates[-1] if len(teammates) > 1 else teammates[0])
      context = f"{display_name} hosted a {duration_str} Live Share session with {teammates_str}"
    else:
      context = f"{display_name} hosted a {duration_str} Live Share session (no teammates joined)"

    prompt = textwrap.dedent(f"""
      Create a short, natural activity feed summary (max 20 words) for this Live Share session.
      Make it sound conversational and friendly.

      Context: {context}

      Examples:
      - "John hosted a 30 minute Live Share session with Sarah & Mike"
      - "Sarah ran a 2 hour Live Share coding session with the team"
      - "Mike held a quick 15 minute pair programming session with John"
    """).strip()

    try:
      resp = model.generate_content(prompt)
      summary = (resp.text or "").strip() or context
    except Exception as e:
      # Fallback to deterministic summary
      summary = context

    activity_type = "live_share_ended"
    source_snapshot_id = body.get("snapshot_id")  # Will be provided by frontend

  else:
    return jsonify({"error": "Invalid event_type. Must be 'started' or 'ended'"}), 400

  # Insert into team_activity_feed
  feed_row = {
    "team_id": team_id,
    "user_id": user_id,
    "summary": summary,
    "file_path": f"session:{session_id}" if session_id else None,
    "source_snapshot_id": source_snapshot_id if event_type == "ended" else None,
    "activity_type": activity_type,
  }
  out = sb_insert("team_activity_feed", feed_row)

  return jsonify({
    "inserted": out,
    "summary": summary,
    "model": MODEL if event_type == "ended" else "none"
  }), 201


@ai_bp.post("/live_share_summary")
def live_share_summary():
  """
  Store git diff changes from a Live Share session in file_snapshots
  Edge function will automatically generate AI summary
  """
  body = request.get_json(force=True) or {}
  session_id = body.get("session_id")
  team_id = body.get("team_id")
  user_id = body.get("user_id")
  changes = body.get("changes", "")

  if not team_id or not user_id:
    return jsonify({"error": "team_id and user_id are required"}), 400

  # Insert git diff into file_snapshots table
  # Edge function will detect this insert and auto-generate summary
  snapshot_row = {
    "user_id": user_id,
    "team_id": team_id,
    "file_path": f"Live Share Session {session_id}",
    "snapshot": "(Live Share session baseline)",
    "changes": changes,  # Store git diff - edge function will summarize this
  }
  snapshot_result = sb_insert("file_snapshots", snapshot_row)

  if not snapshot_result or len(snapshot_result) == 0:
    return jsonify({"error": "Failed to insert snapshot"}), 500

  snapshot_id = snapshot_result[0].get("id")

  return jsonify({
    "snapshot_id": snapshot_id,
    "message": "Snapshot stored, edge function will auto-generate summary"
  }), 201
