from flask import request, render_template, Blueprint, redirect, session
from app.services.auth_service import (
    login_with_email,
    login_with_provider,
    callback,
    signout,
    signup_with_email,
)
from app.models.response import *
from app.models.status_codes import StatusCodes
from flasgger import swag_from


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login")
def login_page():
    return render_template("login.html")


@auth_bp.route("/auth/login", methods=["GET", "POST"])
@swag_from(
    {
        "tags": ["Auth"],
        "summary": "Login route",
        "description": "Handles login with email or provider.",
        "parameters": [
            {
                "name": "provider",
                "in": "query",
                "type": "string",
                "enum": ["email", "github"],
                "required": True,
                "description": "Provider for authentication",
            },
            {
                "name": "next",
                "in": "query",
                "type": "string",
                "description": "Next URL after successful login",
            },
            {
                "name": "body",
                "in": "body",
                "required": False,
                "schema": {
                    "type": "object",
                    "properties": {
                        "email": {"type": "string", "example": "jaime@example.com"},
                        "password": {"type": "string", "example": "password123"},
                    },
                    "required": ["email", "password"],
                },
            },
        ],
        "responses": {
            "200": {"description": "Login successful."},
            "400": {"description": "Bad request (missing provider or email/password)."},
        },
    }
)
def login_route():
    provider = request.args.get("provider", "")
    next_url = request.args.get("next", "/auth/complete")
    if not provider:
        return error_response(
            "Provider not provided. Ex github", None, StatusCodes.BAD_REQUEST
        )

    if provider == "email":
        data = request.json
        email = data.get("email", "")
        password = data.get("password", "")
        if not email or not password:
            return error_response(
                "Email or password not provided", None, StatusCodes.BAD_REQUEST
            )
        res = login_with_email(email, password)
        return success_response(
            "Login successful",
            {
                "token": res.user.id,
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
            },
            StatusCodes.OK,
        )
    else:
        session["next_url"] = next_url
        res = login_with_provider(provider)
        return redirect(res.url)


@auth_bp.route("/auth/complete")
def auth_complete_route():
    return render_template("auth_success.html")


@auth_bp.route("/auth/callback")
def auth():
    code = request.args.get("code")
    next_url = session.pop("next_url", "/auth/complete")
    print("NEXT_URL2", next_url)

    if not code:
        return error_response(
            "Error: Missing authorization code", None, StatusCodes.BAD_REQUEST
        )

    res, status = callback(code)

    redirect_url = f"{next_url}?id={res.user.id}&access_token={res.session.access_token}&refresh_token={res.session.refresh_token}"
    return redirect(redirect_url)


@auth_bp.route("/auth/signup", methods=["POST"])
@swag_from(
    {
        "tags": ["Auth"],
        "summary": "Create a new user",
        "description": "Registers a new user with first name, last name, email, and password.",
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "first_name": {"type": "string", "example": "Jaime"},
                        "last_name": {"type": "string", "example": "Nguyen"},
                        "email": {"type": "string", "example": "jaime@example.com"},
                        "password": {"type": "string", "example": "password123"},
                    },
                    "required": ["first_name", "last_name", "email", "password"],
                },
            }
        ],
        "responses": {
            "201": {
                "description": "User created successfully",
                "schema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "first_name": {"type": "string"},
                        "last_name": {"type": "string"},
                        "email": {"type": "string"},
                    },
                },
            },
            "400": {
                "description": "Bad request (missing fields or email already exists)",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
            "500": {
                "description": "Internal server error",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
        },
    }
)
def signup_route():
    data = request.json
    email = data.get("email", "")
    password = data.get("password", "")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    if not email or not password or not first_name or not last_name:
        return error_response(
            "Email or password not provided", None, StatusCodes.BAD_REQUEST
        )
    res, status_code = signup_with_email(email, password, first_name, last_name)

    if status_code != 201:
        return res

    return success_response(
        "Signup successful",
        {
            "token": res.user.id,
        },
        StatusCodes.OK,
    )


@auth_bp.route("/auth/signout", methods=["POST"])
@swag_from(
    {
        "tags": ["Auth"],
        "summary": "Sign out route",
        "description": "Handles sign out of a user.",
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "properties": {"user_id": {"type": "string", "example": "12345"}},
                    "required": ["user_id"],
                },
            }
        ],
        "responses": {
            200: {"description": "User signed out successfully."},
            400: {"description": "Bad request (missing user ID)."},
        },
    }
)
def signout_route():
    data = request.json
    user_id = data.get("user_id", "")
    if not user_id:
        return error_response("User ID not provided", None, StatusCodes.BAD_REQUEST)
    return signout(user_id)


# @auth_bp.route('/auth/reset-password')
# def reset_password_route():
#     data = request.json
#     token = data['token']
#     new_password = data['password']

#     err = update_user_password()

#     if err:
#         return error_response(
#             err,
#             None,
#             StatusCodes.BAD_REQUEST
#         )
#     return success_response(
#         "Password reset successfully",
#         None,
#         StatusCodes.OK
#     )
