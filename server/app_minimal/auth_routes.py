from flask import Blueprint, request
from .supabase_client import get_client

auth_bp = Blueprint('auth_min', __name__)


@auth_bp.post('/login')
def login():
    """Minimal email/password login.
    Expects JSON { email, password }
    Returns { data: { token } } on success to match extension expectation.
    """
    provider = request.args.get('provider')
    if provider != 'email':
        return {'message': 'only email provider supported in minimal server'}, 400

    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return {'message': 'email and password required'}, 400

    client = get_client()
    try:
        resp = client.auth.sign_in_with_password({'email': email, 'password': password})
        if not resp.user:
            return {'message': 'invalid credentials'}, 401
        return {'data': {'token': resp.user.id}}, 200
    except Exception as e:  # noqa: BLE001
        return {'message': str(e)}, 400


@auth_bp.post('/signup')
def signup():
    """Minimal sign up.
    Expects JSON { email, password, first_name?, last_name? }
    Stores user via Supabase auth; optional name fields are concatenated into display_name in a separate table insert.
    Returns { data: { token } }.
    """
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    if not email or not password:
        return {'error': 'email and password required'}, 400

    client = get_client()
    try:
        resp = client.auth.sign_up({'email': email, 'password': password})
        if not resp.user:
            return {'error': 'sign up failed'}, 400

        # Optional: upsert profile row (ignore failures silently for minimal build)
        display_name = (first_name + ' ' + last_name).strip() or None
        try:  # best-effort; do not break auth flow
            if display_name:
                client.table('users').upsert({'id': resp.user.id, 'email': email, 'display_name': display_name}).execute()
            else:
                client.table('users').upsert({'id': resp.user.id, 'email': email}).execute()
        except Exception:  # noqa: BLE001
            pass

        return {'data': {'token': resp.user.id}}, 201
    except Exception as e:  # noqa: BLE001
        return {'error': str(e)}, 400


@auth_bp.post('/signout')
def signout():
    """Minimal sign out endpoint.
    In Supabase Python client there is no server-side revoke for password sessions using service key; we just return 200.
    Extension only checks response.ok.
    """
    return {'data': {}}, 200