from flask import Blueprint, request, jsonify
from ..database.db import sb_select, sb_insert

notes_bp = Blueprint("notes", __name__, url_prefix="/api/notes")

@notes_bp.get("/")
def get_notes():
    rows = sb_select("notes", {
        "select": "id,title,body,created_at",
        "order": "created_at.desc",
        "limit": "50"
    })
    return jsonify(rows)

@notes_bp.post("/")
def add_note():
    data = request.get_json(force=True)
    out = sb_insert("notes", {
        "title": data.get("title"),
        "body": data.get("body")
    })
    return jsonify(out), 201
