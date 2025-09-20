from flask import session
from app.controllers.database import client
from app.models.response import *
from gotrue.errors import AuthApiError

AUTH_URL = "https://backend-639487598928.us-east5.run.app/auth/callback"
# AUTH_URL = "http://localhost:8001/auth/callback"


def login_with_provider(provider: str):
    # session.clear()  # Ensure fresh session
    res = client.auth.sign_in_with_oauth(
        {
            "provider": provider,
            "options": {"redirect_to": AUTH_URL},
        }
    )
    return res


def login_with_email(
    email: str,
    password: str,
):
    session.clear()  # Ensure fresh session
    res = client.auth.sign_in_with_password(
        {
            "email": email,
            "password": password,
        }
    )

    return res


def callback(code: str):
    """Handles OAuth callback and exchanges code for a session."""
    try:
        res = client.auth.exchange_code_for_session({"auth_code": code})
        print("Client response:", res)
        response = client.table("users").select("*").eq("id", res.user.id).execute()
        user = res.user

        if not response.data:
            metadata = user.user_metadata or {}
            first_name = metadata.get("full_name") or "Unknown"
            # last_name = metadata.get("last_name") or "Unknown"
            email = user.email
            client.table("users").insert(
                {
                    "id": user.id,
                    "first_name": first_name,
                    "last_name": "",
                    "email": email,
                    "status": "ACTIVE",
                }
            ).execute()
        return res, 200
    except Exception as e:
        return error_response(
            f"Authentication failed: {str(e)}", None, StatusCodes.UNAUTHORIZED
        )


def signout(user_id: str):
    """Signs out the user."""
    try:
        client.auth.sign_out()
        return success_response("Signout successful", None, StatusCodes.OK)
    except Exception as e:
        return error_response(
            f"Signout failed: {str(e)}", None, StatusCodes.UNAUTHORIZED
        )


def signup_with_email(
    email: str,
    password: str,
    first_name: str,
    last_name: str,
):
    """
    Create a user in the database

        Args:
        first_name (str): The first name of the user.
        last_name (str): The last name of the user.
        email (str): The email address of the user.
        password (str): The user's password (hashed before storage).

    Returns:
        tuple: A tuple containing:
            - dict: The created user data (if successful).
            - int: HTTP status code (201 for success, 400 for errors, 500 for server errors).

    Raises:
        Exception: If there is an issue with database insertion.
    """
    # session.clear()  # Ensure fresh session
    try:
        res = client.auth.sign_up(
            {
                "email": email,
                "password": password,
            }
        )

        client.table("users").insert(
            {
                "id": res.user.id,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "status": "ACTIVE",
            }
        ).execute()

        return res, 201
    except AuthApiError as e:
        if "User already registered" in str(e):
            return (
                error_response(
                    "User Already Registered", None, StatusCodes.BAD_REQUEST
                ),
                400,
            )
        else:
            return (
                error_response(
                    f"Unknown API Error: {str(e)}", None, StatusCodes.BAD_REQUEST
                ),
                400,
            )

    except Exception as e:
        return (
            error_response(f"Unknown Error: {str(e)}", None, StatusCodes.BAD_REQUEST),
            500,
        )
