import os

from flask import Flask
from flask import session
from flask_cors import CORS
from flask_session import Session

from app.routes import register_blueprints

from flasgger import Swagger
from gotrue import SyncSupportedStorage
from dotenv import load_dotenv

PORT = 8001

load_dotenv()


def getEnvironmentVars(app):
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY. Check your .env file.")

    if not OPENAI_API_KEY:
        print("Warning: OPENAI_API_KEY is not set. API requests will not work.")

    app.config["SUPABASE_URL"] = SUPABASE_URL
    app.config["SUPABASE_KEY"] = SUPABASE_KEY
    app.config["SUPABASE_SERVICE_KEY"] = SUPABASE_SERVICE_KEY
    app.config["OPENAI_API_KEY"] = OPENAI_API_KEY
    app.config["GEMINI_API_KEY"] = GEMINI_API_KEY


def create_app(test_config=None):

    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config["PORT"] = 8001
    app.config["SWAGGER"] = {"title": "Github Copilot Extension"}
    app.config["SESSION_PERMANENT"] = True  # Keep session across requests
    app.config["SESSION_TYPE"] = "filesystem"  # Store session data in files
    app.config["SESSION_FILE_DIR"] = "./flask_session"  # Ensure sessions persist
    app.config["SESSION_COOKIE_SECURE"] = False  # Allow local development
    getEnvironmentVars(app)
    CORS(app)
    register_blueprints(app)
    Session(app)
    Swagger(app)

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile("config.py", silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    return app


if __name__ == "__main__":
    create_app().run(debug=True, port=PORT)


class FlaskSessionStorage(SyncSupportedStorage):
    def __init__(self):
        self.storage = session

    def get_item(self, key: str) -> str | None:
        value = self.storage.get(key, None)
        print(f"Session Get: {key} = {value}")
        return value

    def set_item(self, key: str, value: str) -> None:
        print(f"Session Set: {key} = {value}")
        self.storage[key] = value

    def remove_item(self, key: str) -> None:
        if key in self.storage:
            print(f"Session Remove: {key}")
            self.storage.pop(key, None)
