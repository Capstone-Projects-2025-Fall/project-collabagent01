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
from .routes.jira_route import jira_bp
from .routes.profile_route import profile_bp
from .routes.user_route import user_bp

app.register_blueprint(notes_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(jira_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(user_bp)

# Health check endpoint for UptimeRobot
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "collab-agent-backend"}), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
