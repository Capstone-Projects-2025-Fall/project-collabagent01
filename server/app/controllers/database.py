import base64
import hashlib
import secrets

from supabase.client import Client, ClientOptions, create_client
from werkzeug.local import LocalProxy
from flask import g, session, current_app


def get_session_storage():
    from app import FlaskSessionStorage

    return FlaskSessionStorage()


def get_db() -> Client:
    if "db" not in g:
        g.db = Client(
            current_app.config["SUPABASE_URL"],
            current_app.config["SUPABASE_SERVICE_KEY"],
            options=ClientOptions(
                storage=get_session_storage(),
                flow_type="pkce",
                # auto_refresh_token=False,
                # persist_session=False,
            ),
        )
    return g.db


def get_service_client() -> Client:
    return create_client(
        current_app.config["SUPABASE_URL"],
        current_app.config["SUPABASE_SERVICE_KEY"],
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


client: Client = LocalProxy(get_db)


def generate_code_verifier():
    """Generate a secure random code verifier (43-128 characters)."""
    return secrets.token_urlsafe(64)  # Secure random 64-character string


def generate_code_challenge(verifier):
    """Create a SHA256 challenge from the code verifier (RFC 7636)."""
    sha256_hash = hashlib.sha256(verifier.encode()).digest()
    challenge = (
        base64.urlsafe_b64encode(sha256_hash).decode().rstrip("=")
    )  # Remove '=' padding
    return challenge
