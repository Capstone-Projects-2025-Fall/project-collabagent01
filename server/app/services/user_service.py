from app.controllers.database import client, get_service_client
from app.models.user import User, Class
from app.models.errors import UserAlreadyExistsError, DatabaseError
from datetime import datetime
from pprint import pprint


def update_user_class_status(user_id: str, new_status: str, user_class_id=None):
    """
    Updates the status of a user in a specific class.

    Args:
        user_id (str): The student's user ID
        new_status (str): The new status to set
        user_class_id (str): The class ID to update status in

    Raises:
        DatabaseError: If update fails
    """
    try:
        if user_class_id:
            result = (
                client.table("class_users")
                .update({"user_class_status": new_status})
                .match({"student_id": user_id, "class_id": user_class_id})
                .execute()
            )

            if not result.data:
                raise DatabaseError("No matching class user record found")
        else:
            result = (
                client.table("users")
                .update({"status": new_status})
                .eq("id", user_id)
                .execute()
            )

            if not result.data:
                raise DatabaseError(f"No user record found for id {user_id}")

    except Exception as e:
        print(f"Error updating class user status: {e}")
        raise DatabaseError(f"Failed to update class user status: {str(e)}")


def get_user_class_status(user_id: str, class_id: str):
    """
    Retrieves the class status for a user.

    Args:
        user_id (str): The unique identifier of the user.
        class_id (str, optional): The class identifier to filter by.

    Returns:
        dict: A dictionary containing the user's class status.

    Raises:
        Exception: If there is an error during the database query.
    """
    try:
        query = (
            client.table("class_users")
            .select("user_class_status")
            .eq("student_id", user_id)
            .eq("class_id", class_id)
        )

        response = query.execute()

        return response.data[0] if response.data else None

    except Exception as e:
        print(f"Error fetching user class status: {e}")
        raise DatabaseError(f"Failed to retrieve user class status: {str(e)}")


def create_user_section(user_id: str, class_id: str = None):
    """
    Creates a new user section for the given user, optionally associated with a class.

    Args:
        user_id (str): The unique identifier of the user.
        class_id (str, optional): The class identifier to associate with the section.

    Returns:
        str: The ID of the created user section.

    Raises:
        DatabaseError: If there is an error during the database operation.
    """
    try:
        section_data = {
            "user_id": user_id,
            "started_at": datetime.now().isoformat(),
            "status": "ACTIVE",
        }

        if class_id:
            section_data["class_id"] = class_id

        result = client.table("user_sections").insert(section_data).execute()

        if not result.data:
            raise DatabaseError("Insert operation returned no data")

        return result.data[0]["section_id"]
    except Exception as e:
        print(f"Error creating user section: {e}")
        raise DatabaseError(f"Failed to create user section: {str(e)}")


def get_user_section(user_id: str, class_id: str = None):
    """
    Retrieves or creates a user section, optionally filtered by class_id.

    Args:
        user_id (str): The user's unique identifier
        class_id (str, optional): The class identifier to filter by

    Returns:
        str: The ID of the user section

    Raises:
        Exception: If database operations fail
    """
    try:
        query = (
            client.table("user_sections")
            .select("section_id")
            .eq("user_id", user_id)
            .eq("status", "ACTIVE")
        )

        if class_id is not None:
            query = query.eq("class_id", class_id)
        else:
            query = query.is_("class_id", "null")

        active_section = query.execute()
        active_section_data = active_section.data

        if active_section_data:
            return active_section_data[0]["section_id"]
        else:
            return create_user_section(user_id, class_id)

    except Exception as e:
        print(f"Error retrieving or creating user section: {e}")
        raise DatabaseError(f"Failed to retrieve or create user section: {str(e)}")


def update_user_section(status: str, user_section_id):
    """
    Updates the active user section's status. If status is COMPLETE, it also creates a new section.

    Args:
        user_id (str): The unique identifier of the user.
        status (str): The new status to update to (COMPLETE or NEED_REVIEW).

    Returns:
        dict: New section ID if created, else just a message.
    """
    try:
        client.table("user_sections").update(
            {"status": status, "ended_at": datetime.now().isoformat()}
        ).eq("section_id", user_section_id).execute()

    except Exception as e:
        print(f"Error completing and creating user section: {e}")
        raise DatabaseError(f"Failed to complete and create user section: {str(e)}")


def get_classes_by_user_id(user_id: str):
    """
    Fetch all classes that a specific user is enrolled in.

    Args:
        user_id (str): The unique identifier of the user.

    Returns:
        list: A list of Class objects.
        []: Empty list if the user is not enrolled in any class.
    Raises:
        Exception: If there is an error during the database query.
    """
    try:
        response = (
            client.table("class_users")
            .select("user_class_status, classes(*)")
            .eq("student_id", user_id)
            .eq("enrollment_status", "ENROLLED")
            .execute()
        )

        if not response.data:
            print(f"No classes found for user {user_id}")
            return []

        class_info_list = []
        for class_data in response.data:
            if "classes" in class_data and class_data["classes"]:
                user_class = Class(**class_data["classes"])
                user_class_status = class_data.get(
                    "user_class_status", "UNKNOWN"
                )  # Default if not present
                class_info_list.append(
                    {
                        "userClass": user_class.to_json(),  # You can adjust as needed
                        "studentStatus": user_class_status,
                    }
                )

        return class_info_list

    except Exception as e:
        print(f"Error fetching classes for user {user_id}: {e}")
        raise DatabaseError(f"Failed to retrieve user classes: {str(e)}")


def get_all_users():
    try:
        # Get all users from the `users` table
        response = client.table("users").select("*").execute()
        users_table_data = response.data or []

        # Get all users from Supabase Auth
        auth_users_response = get_service_client().auth.admin.list_users()
        auth_users = auth_users_response

        # Create lookup tables
        users_by_id = {user["id"]: user for user in users_table_data}
        auth_by_id = {user.id: user for user in auth_users}

        all_user_ids = set(users_by_id.keys()) | set(auth_by_id.keys())
        unified_users = []

        for user_id in all_user_ids:
            user_table_data = users_by_id.get(user_id)
            auth_user = auth_by_id.get(user_id)

            entry = {
                **(user_table_data or {}),  # include users table fields if any
                "auth_email": auth_user.email if auth_user else None,
                "auth_created_at": auth_user.created_at if auth_user else None,
                "providers": (
                    auth_user.app_metadata.get("providers") if auth_user else None
                ),
                "last_updated_at": auth_user.updated_at if auth_user else None,
                "avatar_url": (
                    auth_user.user_metadata.get("avatar_url") if auth_user else None
                ),
                "last_sign_in": auth_user.last_sign_in_at if auth_user else None,
            }

            # Determine the source
            if user_table_data and auth_user:
                entry["source"] = "both"
            elif user_table_data:
                entry["source"] = "users_only"
            else:
                entry["source"] = "auth_only"
                entry["id"] = auth_user.id  # ensure ID is present

            unified_users.append(entry)
        return unified_users

    except Exception as e:
        print(f"Error fetching all users: {e}")
        raise DatabaseError(f"Failed to retrieve all users: {str(e)}")


def get_user_by_id(user_id: str):
    """
    Fetch a single user by ID.

    Args:
        user_id (str): The unique identifier of the user.

    Returns:
        dict: A dictionary containing user details if found.
        None: If the user does not exist.

    Raises:
        Exception: If there is an error during the database query.
    """
    try:
        response = client.table("users").select("*").eq("id", user_id).execute()
        user_records = response.data or []

        user_data = user_records[0] if user_records else {}

        auth_user_response = get_service_client().auth.admin.get_user_by_id(user_id)
        auth_user = auth_user_response.user

        user_data["auth_email"] = auth_user.email if auth_user else None
        user_data["auth_created_at"] = auth_user.created_at if auth_user else None
        user_data["providers"] = (
            auth_user.app_metadata.get("providers") if auth_user else None
        )
        user_data["last_updated_at"] = auth_user.updated_at if auth_user else None
        user_data["avatar_url"] = (
            auth_user.user_metadata.get("avatar_url") if auth_user else None
        )
        user_data["last_sign_in"] = auth_user.last_sign_in_at if auth_user else None

        if user_data and auth_user:
            user_data["source"] = "both"
        elif user_data:
            user_data["source"] = "users_only"
        else:
            user_data["source"] = "auth_only"
            user_data["id"] = auth_user.id if auth_user else None  # Ensure ID present

        return User(**user_data)

    except Exception as e:
        print(f"Error fetching user {user_id}: {e}")
        return None


def update_user_settings(user_id, new_settings):
    """
    Updates the settings for a user.

    Args:
        user_id (str): The unique identifier of the user.
        new_settings (dict): A dictionary containing the new settings to update.

    Returns:
        dict: A dictionary containing the updated user settings.
    """
    try:
        client.table("users").update({"settings": new_settings}).eq(
            "id", user_id
        ).execute()
    except Exception as e:
        print(f"Error updating user settings: {e}")
        raise DatabaseError(f"Failed to update user settings: {str(e)}")


def delete_user(user_id: str):
    """
    Deletes a user by their ID.

    Args:
        user_id (str): The unique identifier of the user.

    Returns:
        dict: A dictionary containing the user ID if successful.
        None: If the user does not exist.

    Raises:
        Exception: If there is an error during the database deletion.
    """
    try:
        # Check if user exists first
        existing_user = client.table("users").select("*").eq("id", user_id).execute()

        if not existing_user.data:
            return None

        # Delete the user
        client.table("users").delete().eq("id", user_id).execute()
        get_service_client().auth.admin.delete_user(user_id)

    except Exception as e:
        print(f"Error deleting user: {e}")
        raise DatabaseError(f"Failed to delete user: {str(e)}")


def edit_user(user_id: str, user_data: dict):
    """
    Updates a user's information.

    Args:
        user_id (str): The unique identifier of the user.
        user_data (dict): A dictionary containing the new user data to update.

    Returns:
        dict: A dictionary containing the updated user information.
        None: If the user does not exist.

    Raises:
        Exception: If there is an error during the database update.
    """
    try:

        existing_user = client.table("users").select("*").eq("id", user_id).execute()

        if not existing_user.data:
            return None

        get_service_client().auth.admin.update_user_by_id(
            user_id,
            {
                "email": user_data.get("email"),
                "user_metadata": {
                    "avatar_url": user_data.get("avatar_url"),
                    "first_name": user_data.get("firstName"),
                    "last_name": user_data.get("lastName"),
                },
            },
        )
        non_admin_user_data = {
            "first_name": user_data.get("firstName"),
            "last_name": user_data.get("lastName"),
            "email": user_data.get("email"),
            "role": user_data.get("role"),
        }
        client.table("users").update(non_admin_user_data).eq("id", user_id).execute()

    except Exception as e:
        print(f"Error updating user: {e}")
        raise DatabaseError(f"Failed to update user: {str(e)}")


def update_password(user_id: str, user_data: dict):
    try:
        existing_user = client.table("users").select("*").eq("id", user_id).execute()
        if existing_user.data == None:
            return None

        return get_service_client().auth.admin.update_user_by_id(
            user_id,
            {
                "password": user_data,
            },
        )

    except Exception as e:
        print(f"Error updating user: {e}")
        raise DatabaseError(f"Failed to update user: {str(e)}")
