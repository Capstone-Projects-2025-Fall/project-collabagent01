import os

class Config:
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    TESTING = os.getenv('TESTING', 'False') == 'True'
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'your_gemini_api_key')
    DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///mock_db.sqlite3')