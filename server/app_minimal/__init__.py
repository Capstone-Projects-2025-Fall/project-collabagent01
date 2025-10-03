from flask import Flask
from .supabase_client import get_client  # noqa: F401 (ensures lazy client pattern available)
from .routes import users_bp
from .auth_routes import auth_bp
import os


def create_app():
    app = Flask(__name__)

    # Basic config (only what we need)
    app.config['SUPABASE_URL'] = os.environ.get('SUPABASE_URL', '')
    app.config['SUPABASE_KEY'] = os.environ.get('SUPABASE_SERVICE_KEY') or os.environ.get('SUPABASE_ANON_KEY', '')

    if not app.config['SUPABASE_URL'] or not app.config['SUPABASE_KEY']:
        raise RuntimeError('SUPABASE_URL and SUPABASE_SERVICE_KEY/ANON_KEY must be set')

    # Register minimal API blueprints
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/auth')

    @app.get('/api/health')
    def health():
        return {'ok': True}

    return app
