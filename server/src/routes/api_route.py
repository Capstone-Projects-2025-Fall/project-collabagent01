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
  """Return recent team activity feed rows for a team."""
  team_id = request.args.get("team_id")
  limit = request.args.get("limit", "20")
  if not team_id:
    return jsonify({"error": "team_id is required"}), 400

  rows = sb_select("team_activity_feed", {
    "select": "id,team_id,user_id,summary,file_path,source_snapshot_id,activity_type,created_at",
    "team_id": f"eq.{team_id}",
    "order": "created_at.desc",
    "limit": str(limit)
  })
  return jsonify(rows)
