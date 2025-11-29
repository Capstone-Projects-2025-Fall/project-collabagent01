from flask import Blueprint, request, jsonify
from ..database.db import sb_select, sb_insert, sb_update

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")

@profile_bp.route("/", methods=["GET"], strict_slashes=False)
def get_profile():
    """
    Get the current user's profile.
    Requires Authorization header with JWT token.
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        
        profiles = sb_select("user_profiles", {
            "select": "id,user_id,name,interests,custom_skills,updated_at",
            "user_id": f"eq.{user_id}",
            "limit": "1"
        })
        
        if not profiles:
            return jsonify({
                "profile": None,
                "message": "No profile found"
            }), 200
        
        return jsonify({
            "profile": profiles[0]
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@profile_bp.route("/", methods=["POST"], strict_slashes=False)
def save_profile():
    """
    Create or update the current user's profile.
    Requires Authorization header with JWT token.
    """
    auth_header = request.headers.get("Authorization", "")
    
    # For MVP, just check that header exists and has Bearer prefix with some content
    if not auth_header or not auth_header.startswith("Bearer ") or len(auth_header.strip()) <= 7:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    
    body = request.get_json(force=True)
    user_id = body.get("user_id")
    name = body.get("name", "")
    interests = body.get("interests", [])
    custom_skills = body.get("custom_skills", [])
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        existing = sb_select("user_profiles", {
            "select": "id",
            "user_id": f"eq.{user_id}",
            "limit": "1"
        })
        
        profile_data = {
            "user_id": user_id,
            "name": name,
            "interests": interests,
            "custom_skills": custom_skills
        }
        
        if existing:
            result = sb_update("user_profiles", 
                {"user_id": f"eq.{user_id}"}, 
                profile_data
            )
            return jsonify({
                "profile": result[0] if result else profile_data,
                "message": "Profile updated successfully"
            }), 200
        else:
            result = sb_insert("user_profiles", profile_data)
            return jsonify({
                "profile": result[0] if result else profile_data,
                "message": "Profile created successfully"
            }), 201
    except Exception as e:
        print(f"Error saving profile: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
