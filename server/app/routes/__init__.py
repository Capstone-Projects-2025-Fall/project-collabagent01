from flask import Blueprint
from .suggestions import suggestions_bp
from .logging import logging_bp
from .main_page import main_page_bp
from .user import users_bp
from .docs import docs_bp
from .auth import auth_bp
from .quiz import quiz_bp
from .classes import classes_bp

def register_blueprints(app):
    app.register_blueprint(suggestions_bp)
    app.register_blueprint(logging_bp)
    app.register_blueprint(main_page_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(docs_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(classes_bp)
