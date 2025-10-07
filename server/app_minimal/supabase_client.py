from supabase import create_client, Client
from flask import current_app, g


def get_client() -> Client:
    if 'supabase_client' not in g:
        url = current_app.config['SUPABASE_URL']
        key = current_app.config['SUPABASE_KEY']
        g.supabase_client = create_client(url, key)
    return g.supabase_client
