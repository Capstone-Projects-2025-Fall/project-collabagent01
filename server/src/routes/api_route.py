from flask import Blueprint, request, jsonify
import os, textwrap
import google.generativeai as genai
from ..database.db import sb_select, sb_insert

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

SIMPLE_MODEL = os.getenv("SIMPLE_MODEL")
ADVANCE_MODEL = os.getenv("ADVANCE_MODEL")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
simple_model = genai.GenerativeModel(SIMPLE_MODEL)
advance_model = genai.GenerativeModel(ADVANCE_MODEL)


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

    resp = advance_model.generate_content(prompt)
    return jsonify({
      "summary": (resp.text or "").strip() or "(no output)",
      "meta": {"row_count": len(rows), "model": ADVANCE_MODEL}
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
    resp = simple_model.generate_content(prompt)
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
    "model": SIMPLE_MODEL
  }), 201


@ai_bp.get("/feed")
def get_feed():
  """Return recent team activity feed rows for a team with changes from file_snapshots."""
  team_id = request.args.get("team_id")
  limit = request.args.get("limit", "20")
  if not team_id:
    return jsonify({"error": "team_id is required"}), 400

  # Select from team_activity_feed and join with file_snapshots to get changes and snapshot
  rows = sb_select("team_activity_feed", {
    "select": "id,team_id,user_id,summary,event_header,file_path,source_snapshot_id,activity_type,created_at,file_snapshots(changes,snapshot)",
    "team_id": f"eq.{team_id}",
    "order": "created_at.desc",
    "limit": str(limit)
  })

  # Flatten the nested file_snapshots data
  for row in rows:
    if row.get("file_snapshots") and isinstance(row["file_snapshots"], dict):
      row["changes"] = row["file_snapshots"].get("changes")
      row["snapshot"] = row["file_snapshots"].get("snapshot")
    else:
      row["changes"] = None
      row["snapshot"] = None
    # Remove the nested object
    row.pop("file_snapshots", None)

  # Get unique user_ids from the activity feed
  user_ids = list(set(row.get("user_id") for row in rows if row.get("user_id")))

  # Fetch user profiles for display names (name field)
  user_profiles = {}
  if user_ids:
    try:
      profiles = sb_select("user_profiles", {
        "select": "user_id,name",
        "user_id": f"in.({','.join(user_ids)})"
      })
      user_profiles = {p["user_id"]: p.get("name") for p in profiles if p.get("name")}
    except Exception as e:
      print(f"Warning: Could not fetch user profiles: {e}")

  # Fetch user emails from auth.users using Supabase Admin API
  user_emails = {}
  if user_ids:
    try:
      from supabase import create_client, Client
      supabase_url = os.getenv("SUPABASE_URL")
      service_key = os.getenv("SUPABASE_SERVICE_KEY")
      if supabase_url and service_key:
        supabase: Client = create_client(supabase_url, service_key)
        # Fetch users using admin API
        for user_id in user_ids:
          try:
            user_response = supabase.auth.admin.get_user_by_id(user_id)
            if user_response and user_response.user:
              user_emails[user_id] = user_response.user.email
          except Exception as e:
            print(f"Warning: Could not fetch user {user_id}: {e}")
    except Exception as e:
      print(f"Warning: Could not initialize Supabase client for user emails: {e}")

  # Add display_name to each row with fallback priority: name -> email -> user_id
  for row in rows:
    user_id = row.get("user_id")
    if user_id:
      # Try name from user_profiles first
      if user_id in user_profiles and user_profiles[user_id]:
        row["display_name"] = user_profiles[user_id]
        row["user_email"] = user_emails.get(user_id)
      # Fallback to email
      elif user_id in user_emails and user_emails[user_id]:
        row["display_name"] = user_emails[user_id]
        row["user_email"] = user_emails[user_id]
      # Final fallback to shortened user_id
      else:
        row["display_name"] = user_id[:8] + "…"
        row["user_email"] = None
    else:
      row["display_name"] = "Unknown"
      row["user_email"] = None

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
    event_header = f"{display_name} started hosting a Live Share session, join up and collaborate"
    activity_type = "live_share_started"
    summary = None  # No AI summary yet for started events

  # Handle session end event
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
      duration_str = "quick"
    elif duration_minutes < 60:
      duration_str = f"{duration_minutes}-minute"
    else:
      hours = duration_minutes // 60
      mins = duration_minutes % 60
      if mins > 0:
        duration_str = f"{hours}h {mins}m"
      else:
        duration_str = f"{hours}-hour"

    # Create preset event header (not AI-generated)
    if teammates:
      teammates_str = " & ".join(teammates) if len(teammates) <= 2 else f"{teammates[0]} & others"
      event_header = f"{display_name} ran a {duration_str} Live Share session with {teammates_str}"
    else:
      event_header = f"{display_name} ran a {duration_str} Live Share solo session"

    activity_type = "live_share_ended"
    summary = None  # Will be filled by edge function with AI summary
    source_snapshot_id = body.get("snapshot_id")  # Will be provided by frontend

  else:
    return jsonify({"error": "Invalid event_type. Must be 'started' or 'ended'"}), 400

  # Insert into team_activity_feed
  feed_row = {
    "team_id": team_id,
    "user_id": user_id,
    "event_header": event_header,  # Preset descriptive header
    "summary": summary,  # AI summary (null initially, filled by edge function)
    "file_path": f"session:{session_id}" if session_id else None,
    "source_snapshot_id": source_snapshot_id if event_type == "ended" else None,
    "activity_type": activity_type,
  }
  out = sb_insert("team_activity_feed", feed_row)

  return jsonify({
    "inserted": out,
    "event_header": event_header,
    "model": "preset"
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


@ai_bp.get("/skill_summary")
def skill_summary():
    """
    Get an AI-powered summary of users who have a particular skill.
    Query parameter: skill (e.g., ?skill=Python)
    Returns: JSON with count, user list, and AI summary
    """
    skill = request.args.get("skill", "").strip()
    if not skill:
        return jsonify({"error": "skill parameter is required"}), 400

    try:
        # Query user_profiles for users with this skill in interests, strengths, or custom_skills
        # PostgreSQL array contains operator: @>
        profiles = sb_select("user_profiles", {
            "select": "user_id,name,interests,strengths,weaknesses,custom_skills",
            "or": f"(interests.cs.{{{skill}}},strengths.cs.{{{skill}}},custom_skills.cs.{{{skill}}})"
        })

        count = len(profiles) if profiles else 0
        
        if count == 0:
            return jsonify({
                "skill": skill,
                "count": 0,
                "users": [],
                "summary": f"No users found with {skill} in their profile.",
                "model": SIMPLE_MODEL
            }), 200

        # Build a compact summary of matched users
        matched = []
        for p in profiles:
            matched.append({
                "name": p.get("name") or "Anonymous",
                "user_id": p.get("user_id"),
                "interests": p.get("interests") or [],
                "strengths": p.get("strengths") or []
            })

        # Build AI prompt
        user_list = "\n".join([
            f"- {u['name']}: interests={u['interests']}, strengths={u['strengths']}"
            for u in matched
        ])

        prompt = textwrap.dedent(f"""
            You are a team coordinator AI. Summarize the following users who have "{skill}" 
            in their profile. Provide a brief, actionable summary highlighting:
            1. Total count of users with this skill
            2. Their key strengths and interests related to {skill}
            3. Suggestions for task delegation based on their profiles
            
            Keep it concise (2-3 sentences).
            
            USERS:
            {user_list}
        """).strip()

        resp = simple_model.generate_content(prompt)
        summary_text = (resp.text or "").strip() or f"{count} users found with {skill} skill."

        return jsonify({
            "skill": skill,
            "count": count,
            "users": matched,
            "summary": summary_text,
            "model": SIMPLE_MODEL
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
