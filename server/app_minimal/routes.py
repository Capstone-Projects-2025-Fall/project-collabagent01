from flask import Blueprint, request
from .supabase_client import get_client
import uuid

users_bp = Blueprint('users_min', __name__)

@users_bp.post('/users')
def create_user():
    data = request.get_json(force=True, silent=True) or {}
    email = data.get('email')
    display_name = data.get('display_name')
    if not email:
        return {'error': 'email is required'}, 400

    client = get_client()
    # Upsert logic (optional) — for now just insert
    resp = client.table('users').insert({
        'email': email,
        'display_name': display_name
    }).execute()
    return {'user': resp.data[0]} if resp.data else ({'error': 'insert failed'}, 500)

@users_bp.get('/users')
def list_users():
    client = get_client()
    resp = client.table('users').select('*').execute()
    return {'users': resp.data}

@users_bp.get('/users/<user_id>')
def get_user(user_id):
    # Accept either UUID or attempt direct match
    try:
        uuid.UUID(user_id)
    except ValueError:
        return {'error': 'invalid id'}, 400
    client = get_client()
    resp = client.table('users').select('*').eq('id', user_id).single().execute()
    if resp.data:
        return {'user': resp.data}
    return {'error': 'not found'}, 404
