from flask import Blueprint, request, jsonify
import os, textwrap
import google.generativeai as genai
from ..database.db import sb_select

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
