from flask import Blueprint, jsonify, request
import os
import requests

user_bp = Blueprint("users", __name__, url_prefix="/users")

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or ""


@user_bp.route("/<user_id>", methods=["GET"])
def get_user_by_id(user_id):
    """
    Get user information by user ID/access token.
    The frontend passes the access token as the user_id parameter.
    We use it to get the authenticated user from Supabase.
    """
    try:
        if not SUPABASE_URL or not SERVICE_KEY:
            return jsonify({"error": "Backend configuration error"}), 500

        # The user_id parameter is actually an access token
        # Use it to get the user from Supabase Auth API
        headers = {
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {user_id}",  # Use the access token
            "Content-Type": "application/json"
        }

        # Get user from Supabase Auth
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=headers,
            timeout=10
        )

        if response.status_code != 200:
            print(f"Supabase auth error: {response.status_code} - {response.text}")
            return jsonify({"error": "Invalid or expired token"}), 401

        user_auth_data = response.json()

        # Extract user metadata
        user_metadata = user_auth_data.get("user_metadata", {})

        # Return user data in the format the extension expects
        user_data = {
            "id": user_auth_data.get("id"),
            "email": user_auth_data.get("email"),
            "first_name": user_metadata.get("first_name", user_metadata.get("full_name", "").split()[0] if user_metadata.get("full_name") else "User"),
            "last_name": user_metadata.get("last_name", user_metadata.get("full_name", "").split()[-1] if user_metadata.get("full_name") else ""),
            "is_locked": False,
            "code_context_id": None,
            "status": "ACTIVE",
            "role": user_auth_data.get("role", "user"),
            "settings": {
                "bug_percentage": 0.1,
                "show_notifications": True,
                "give_suggestions": True,
                "enable_quiz": False,
                "active_threshold": 80,
                "suspend_threshold": 50,
                "pass_rate": 0.7,
                "suspend_rate": 0.3,
                "intervened": False
            }
        }

        return jsonify({"data": user_data}), 200

    except Exception as e:
        print(f"Error getting user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
