from flask import Blueprint, request, jsonify
import os
import requests
from ..database.db import sb_select, sb_update, sb_delete, sb_insert

account_bp = Blueprint("account", __name__, url_prefix="/api/account")

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def get_user_display_name(user_id):
    """Get a user's display name from their profile, or fallback to shortened user_id."""
    try:
        profiles = sb_select("user_profiles", {
            "select": "name",
            "user_id": f"eq.{user_id}",
            "limit": "1"
        })
        if profiles and profiles[0].get("name"):
            return profiles[0].get("name")
    except Exception as e:
        print(f"[get_user_display_name] Error fetching profile for {user_id}: {e}")
    # Fallback to shortened user_id
    return user_id[:8] + "…"


@account_bp.route("/delete", methods=["POST"], strict_slashes=False)
def delete_account():
    """
    Delete user account with team ownership transfer logic.
    """
    try:
        print("[DELETE ACCOUNT] Starting account deletion process")

        if not SUPABASE_URL or not SERVICE_KEY:
            print("[DELETE ACCOUNT] ERROR: Missing Supabase configuration")
            return jsonify({"error": "Backend configuration error"}), 500

        # Get authorization token
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            print("[DELETE ACCOUNT] ERROR: Missing or invalid Authorization header")
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        access_token = auth_header.replace("Bearer ", "").strip()

        # Get user ID from access token
        print("[DELETE ACCOUNT] Fetching user info from access token")
        headers = {
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=headers,
            timeout=10
        )

        if response.status_code != 200:
            print(f"[DELETE ACCOUNT] ERROR: Failed to authenticate user - {response.status_code}")
            return jsonify({"error": "Invalid or expired token"}), 401

        user_data = response.json()
        user_id = user_data.get("id")

        if not user_id:
            print("[DELETE ACCOUNT] ERROR: Could not extract user ID from token")
            return jsonify({"error": "Could not identify user"}), 400

        print(f"[DELETE ACCOUNT] User ID: {user_id}")

        # Get deleting user's display name for event logging
        deleting_user_name = get_user_display_name(user_id)
        print(f"[DELETE ACCOUNT] Deleting user name: {deleting_user_name}")

        # Find teams where user is admin
        print("[DELETE ACCOUNT] Finding user's team memberships")
        team_memberships = sb_select("team_membership", {
            "select": "id,team_id,role",
            "user_id": f"eq.{user_id}"
        })

        print(f"[DELETE ACCOUNT] Found {len(team_memberships)} team memberships")

        admin_teams = [m for m in team_memberships if m.get("role") == "admin"]
        print(f"[DELETE ACCOUNT] User is admin of {len(admin_teams)} teams")

        # Handle each admin team
        for membership in admin_teams:
            team_id = membership.get("team_id")
            print(f"[DELETE ACCOUNT] Processing admin team: {team_id}")

            # Get all members of this team
            all_members = sb_select("team_membership", {
                "select": "id,user_id,role,joined_at",
                "team_id": f"eq.{team_id}"
            })

            other_members = [m for m in all_members if m.get("user_id") != user_id]
            print(f"[DELETE ACCOUNT] Team has {len(other_members)} other members")

            if len(other_members) == 0:
                # Delete empty team
                print(f"[DELETE ACCOUNT] No other members, deleting team {team_id}")
                try:
                    sb_delete("team_jira_configs", {"team_id": f"eq.{team_id}"})
                except Exception as e:
                    print(f"[DELETE ACCOUNT] Note: No Jira config to delete or error: {e}")

                sb_delete("team_membership", {"team_id": f"eq.{team_id}"})
                sb_delete("teams", {"id": f"eq.{team_id}"})
                print(f"[DELETE ACCOUNT] Team {team_id} deleted")
            else:
                # Transfer ownership
                print(f"[DELETE ACCOUNT] Transferring ownership for team {team_id}")
                other_admins = [m for m in other_members if m.get("role") == "admin"]

                new_admin_id = None
                if other_admins:
                    new_admin_id = other_admins[0].get("user_id")
                    print(f"[DELETE ACCOUNT] Transferring to existing admin {new_admin_id}")
                else:
                    # Sort by joined_at to find the oldest member
                    sorted_members = sorted(other_members, key=lambda m: m.get("joined_at", ""))
                    new_admin = sorted_members[0]
                    new_admin_id = new_admin.get("user_id")
                    membership_id = new_admin.get("id")
                    print(f"[DELETE ACCOUNT] Promoting member {new_admin_id} to admin")
                    sb_update("team_membership", {"id": f"eq.{membership_id}"}, {"role": "admin"})

                sb_update("teams", {"id": f"eq.{team_id}"}, {"created_by": new_admin_id})
                print(f"[DELETE ACCOUNT] Ownership transferred")

                # Create participant status event for admin transfer
                try:
                    new_admin_name = get_user_display_name(new_admin_id)
                    event_header = f"{deleting_user_name} has deleted their account. Admin role has been transferred to {new_admin_name}."

                    feed_row = {
                        "team_id": team_id,
                        "user_id": new_admin_id,  # Use new admin as the event initiator
                        "event_header": event_header,
                        "summary": None,
                        "file_path": None,
                        "source_snapshot_id": None,
                        "activity_type": "participant_status",
                    }

                    sb_insert("team_activity_feed", feed_row)
                    print(f"[DELETE ACCOUNT] Participant status event created for team {team_id}")
                except Exception as e:
                    print(f"[DELETE ACCOUNT] Warning: Failed to create participant status event: {e}")

                # Disconnect Jira
                try:
                    sb_delete("team_jira_configs", {"team_id": f"eq.{team_id}"})
                    print(f"[DELETE ACCOUNT] Jira disconnected for team {team_id}")
                except Exception as e:
                    print(f"[DELETE ACCOUNT] Note: No Jira config to delete or error: {e}")

        # Delete user's team memberships
        print("[DELETE ACCOUNT] Deleting user's team memberships")
        sb_delete("team_membership", {"user_id": f"eq.{user_id}"})

        # Delete user profile
        print("[DELETE ACCOUNT] Deleting user profile")
        try:
            sb_delete("user_profiles", {"user_id": f"eq.{user_id}"})
        except Exception as e:
            print(f"[DELETE ACCOUNT] Note: No profile to delete or error: {e}")

        # Delete user from Supabase Auth
        print("[DELETE ACCOUNT] Deleting user from Supabase Auth")
        admin_headers = {
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json"
        }

        delete_response = requests.delete(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=admin_headers,
            timeout=10
        )

        if delete_response.status_code not in [200, 204]:
            print(f"[DELETE ACCOUNT] ERROR: Failed to delete user from auth - {delete_response.status_code}")
            return jsonify({"error": f"Failed to delete account: {delete_response.text}"}), 500

        print("[DELETE ACCOUNT] Account deletion completed successfully")
        return jsonify({"success": True, "message": "Account deleted successfully"}), 200

    except Exception as e:
        print(f"[DELETE ACCOUNT] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete account: {str(e)}"}), 500
