import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # allow cross-origin for development


from .routes.notes_route import notes_bp
from .routes.api_route import ai_bp

app.register_blueprint(notes_bp)
app.register_blueprint(ai_bp)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
