from flask import Blueprint, request
from app.services.user_service import (
    get_user_by_id,
    create_user_section,
    get_user_section,
    update_user_section,
    update_user_class_status,
    update_user_settings,
    get_classes_by_user_id,
    get_all_users,
    delete_user,
    edit_user,
    get_user_class_status,
    update_password,
)
from app.models.response import *
from flasgger import swag_from
from app.models.status_codes import StatusCodes


users_bp = Blueprint("users", __name__)


@users_bp.route("/users/<user_id>", methods=["GET"])
@swag_from(
    {
        "tags": ["Users"],
        "summary": "TODO Get a specific user by ID",
        "description": "Retrieves user details based on the provided user ID.",
        "parameters": [
            {
                "name": "user_id",
                "in": "path",
                "required": True,
                "type": "string",
                "example": "123",
            }
        ],
        "responses": {
            "200": {
                "description": "User found successfully",
                "schema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "email": {"type": "string"},
                    },
                },
            },
            "404": {
                "description": "User not found",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
        },
    }
)
def get_user_route(user_id):
    try:
        user = get_user_by_id(user_id)

        if not user:
            return success_response(
                f"User not found for id {user_id}", None, StatusCodes.NOT_FOUND
            )

        return success_response(
            f"User for id {user_id}", user.to_json(), StatusCodes.OK
        )

    except Exception as e:
        return error_response(
            f"Error fetching user {user_id}: {e}", None, StatusCodes.SERVER_ERROR
        )


@users_bp.route("/users/<user_id>/status", methods=["PUT"])
def update_user_status_route(user_id):
    try:
        data = request.get_json()
        new_status = data.get("status")
        user_class_id = data.get("userClassId")

        valid_statuses = {"ACTIVE", "SUSPENDED", "LOCKED"}

        if new_status not in valid_statuses:
            return error_response(
                f"Invalid status '{new_status}'. Must be one of {valid_statuses}.",
                None,
                StatusCodes.BAD_REQUEST,
            )

        update_user_class_status(user_id, new_status, user_class_id)

        return success_response(
            f"User status updated to '{new_status}' for user {user_id}",
            None,
            StatusCodes.OK,
        )

    except Exception as e:
        return error_response(
            f"Error updating user status for {user_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )


@users_bp.route("/users/<user_id>/class-status", methods=["GET"])
@swag_from(
    {
        "tags": ["Users"],
        "summary": "TODO Get lock status of a specific user by ID",
        "description": "Retrieves lock status of a user based on the provided user ID.",
        "parameters": [
            {
                "name": "user_id",
                "in": "path",
                "required": True,
                "type": "string",
                "example": "123",
            }
        ],
        "responses": {
            "200": {
                "description": "User lock status found successfully",
                "schema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "is_locked": {"type": "boolean"},
                    },
                },
            },
            "404": {
                "description": "User not found",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
        },
    }
)
def get_user_class_status_route(user_id):
    try:
        class_id = request.args.get("class_id")

        print(f"Class ID: {class_id}")

        user_class_status = get_user_class_status(user_id, class_id)

        if not user_class_status:
            return success_response(
                f"User class status found for id {user_id}", None, StatusCodes.NOT_FOUND
            )

        print(user_class_status)

        return success_response(
            f"User class status for id {user_id}",
            {"user_class_status": user_class_status},
            StatusCodes.OK,
        )

    except Exception as e:
        return error_response(
            f"Error fetching user {user_id}: {e}", None, StatusCodes.SERVER_ERROR
        )


@users_bp.route("/users/<user_id>/sections", methods=["POST"])
def create_user_section_route(user_id):
    try:
        user_section_id = create_user_section(user_id)
        return success_response(
            f"User section created for user {user_id}",
            {"user_section_id": user_section_id},
            StatusCodes.CREATED,
        )

    except Exception as e:
        return error_response(
            f"Error creating user section for {user_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )


@users_bp.route("/users/<user_id>/sections", methods=["GET"])
def get_user_section_route(user_id):
    try:
        class_id = request.args.get("class_id")
        user_section_id = get_user_section(user_id, class_id)

        return success_response(
            f"User section retrieved or created for user {user_id}",
            {"user_section_id": user_section_id},
            StatusCodes.OK,
        )

    except Exception as e:
        return error_response(
            f"Error retrieving or creating user section for {user_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )


@users_bp.route("/users/<user_id>/sections", methods=["PUT"])
def update_user_section_route(user_id):
    try:
        data = request.get_json()
        user_section_id = data.get("userSectionId")

        if not user_section_id:
            return error_response(
                "userSectionId is required", None, StatusCodes.BAD_REQUEST
            )

        new_status = data.get("status", "").upper()

        valid_statuses = {"COMPLETE", "NEED_REVIEW"}
        if new_status not in valid_statuses:
            return error_response(
                f"Invalid status '{new_status}'. Must be one of {valid_statuses}.",
                None,
                StatusCodes.BAD_REQUEST,
            )

        update_user_section(new_status, user_section_id)

        return success_response(
            f"User section updated for user {user_id}", None, StatusCodes.OK
        )

    except Exception as e:
        return error_response(
            f"Error updating user section for {user_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )


@users_bp.route("/users/<user_id>/settings", methods=["PUT"])
def update_user_settings_route(user_id):
    try:
        new_settings = request.get_json()

        if not new_settings:
            return error_response(
                "Error: Missing settings", None, StatusCodes.BAD_REQUEST
            )

        update_user_settings(user_id, new_settings)

        return success_response(
            f"User settings updated for id {user_id}", None, StatusCodes.OK
        )

    except Exception as e:
        return error_response(
            f"Error updating user settings {user_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )


@users_bp.route("/users/<user_id>/classes", methods=["GET"])
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Get classes for a specific user",
        "description": "Retrieves all classes associated with the given user ID.",
        "parameters": [
            {
                "name": "user_id",
                "in": "path",
                "required": True,
                "type": "string",
                "example": "123",
            }
        ],
        "responses": {
            "200": {
                "description": "Classes found successfully",
                "schema": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "class_title": {"type": "string"},
                            "class_code": {"type": "string"},
                            "class_hex_color": {"type": "string"},
                            "class_image_cover": {"type": "string"},
                        },
                    },
                },
            },
            "404": {
                "description": "No classes found for the user",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
        },
    }
)
def get_user_classes_route(user_id):
    try:
        user_classes = get_classes_by_user_id(user_id)

        if not user_classes:
            return success_response(
                f"No classes found for user id {user_id}", [], StatusCodes.NOT_FOUND
            )

        return success_response(
            f"Classes for user id {user_id}", user_classes, StatusCodes.OK
        )
    except Exception as e:
        return error_response(
            f"Error fetching classes for user {user_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )


@users_bp.route("/users", methods=["GET"])
@swag_from(
    {
        "tags": ["Users"],
        "summary": "Get all users",
        "description": "Retrieves all users in the system.",
        "responses": {
            "200": {
                "description": "Users found successfully",
                "schema": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "email": {"type": "string"},
                        },
                    },
                },
            },
            "404": {
                "description": "No users found",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
        },
    }
)
def get_all_users_route():
    try:
        users = get_all_users()

        if not users:
            return success_response("No users found", [], StatusCodes.NOT_FOUND)

        return success_response("All users", users, StatusCodes.OK)

    except Exception as e:
        return error_response(
            f"Error fetching all users: {e}", None, StatusCodes.SERVER_ERROR
        )


@users_bp.route("/users/<user_id>", methods=["DELETE"])
def delete_user_route(user_id):
    try:

        if not user_id:
            return error_response(
                "Error: Missing user ID", False, StatusCodes.BAD_REQUEST
            )

        delete_user(user_id)

        return success_response(
            f"User with ID {user_id} deleted successfully", True, StatusCodes.OK
        )

    except Exception as e:
        return error_response(
            f"Error deleting user {user_id}: {e}", False, StatusCodes.SERVER_ERROR
        )


@users_bp.route("/users/<user_id>", methods=["PUT"])
def update_user_route(user_id):
    try:
        data = request.get_json()

        if not data:
            return error_response(
                "Error: Missing user data", None, StatusCodes.BAD_REQUEST
            )

        updated_user = edit_user(user_id, data)

        return success_response(
            f"User updated successfully for id {user_id}", None, StatusCodes.OK
        )

    except Exception as e:
        return error_response(
            f"Error updating user {user_id}: {e}", None, StatusCodes.SERVER_ERROR
        )


@users_bp.route("/users/<user_id>/password", methods=["PUT"])
def update_user_password_route(user_id):
    try:
        data = request.get_json()

        if not data:
            return error_response(
                "Error: Missing password", None, StatusCodes.BAD_REQUEST
            )

        updated_user = update_password(user_id, data)
        if updated_user == None:
            return error_response(
                f"Error updating user {user_id}: User not found",
                None,
                StatusCodes.NOT_FOUND,
            )

        return success_response(
            f"User updated successfully for id {user_id}", None, StatusCodes.OK
        )

    except Exception as e:
        return error_response(
            f"Error updating user {user_id}: {e}", None, StatusCodes.SERVER_ERROR
        )
