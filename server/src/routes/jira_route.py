from flask import Blueprint, request, jsonify
import requests
import os
from ..database.db import sb_select, sb_insert, sb_update

jira_bp = Blueprint("jira", __name__, url_prefix="/api/jira")

# Get Supabase config for direct REST calls
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or ""

def sb_delete(table: str, params: dict):
    """Delete function using direct REST API call."""
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    rest_url = f"{SUPABASE_URL}/rest/v1"
    r = requests.delete(f"{rest_url}/{table}", headers=headers, params=params, timeout=20)
    r.raise_for_status()
    return r.json() if r.text else []

@jira_bp.post("/config")
def save_jira_config():
    """Save Jira configuration for a team."""
    body = request.get_json(force=True) or {}

    required_fields = ['team_id', 'jira_url', 'jira_project_key', 'access_token', 'admin_user_id']
    for field in required_fields:
        if field not in body:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    # Check if config already exists for this team
    existing = sb_select("team_jira_configs", {
        "select": "id",
        "team_id": f"eq.{body['team_id']}",
        "limit": "1"
    })

    if existing:
        # Update existing config
        result = sb_update("team_jira_configs", {
            "team_id": f"eq.{body['team_id']}"
        }, {
            "jira_url": body['jira_url'],
            "jira_project_key": body['jira_project_key'],
            "access_token": body['access_token'],
            "admin_user_id": body['admin_user_id']
        })
    else:
        # Insert new config
        config_data = {
            "team_id": body['team_id'],
            "jira_url": body['jira_url'],
            "jira_project_key": body['jira_project_key'],
            "access_token": body['access_token'],
            "admin_user_id": body['admin_user_id']
        }
        result = sb_insert("team_jira_configs", config_data)

    if result:
        return jsonify({"message": "Jira configuration saved successfully"}), 200
    else:
        return jsonify({"error": "Failed to save Jira configuration"}), 500

@jira_bp.get("/config/<team_id>")
def get_jira_config(team_id):
    """Get Jira configuration for a team."""
    configs = sb_select("team_jira_configs", {
        "select": "id,team_id,jira_url,jira_project_key,access_token,admin_user_id,created_at",
        "team_id": f"eq.{team_id}",
        "limit": "1"
    })

    if configs:
        return jsonify(configs[0]), 200
    else:
        return jsonify({"error": "Jira configuration not found"}), 404

@jira_bp.delete("/config/<team_id>")
def delete_jira_config(team_id):
    """Delete Jira configuration for a team."""
    # First check if config exists
    existing = sb_select("team_jira_configs", {
        "select": "id",
        "team_id": f"eq.{team_id}",
        "limit": "1"
    })

    if not existing:
        return jsonify({"error": "Jira configuration not found"}), 404

    # Delete the config
    try:
        sb_delete("team_jira_configs", {
            "team_id": f"eq.{team_id}"
        })
        return jsonify({"message": "Jira configuration deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete Jira configuration: {str(e)}"}), 500
