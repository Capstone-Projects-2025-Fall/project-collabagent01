import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # allow cross-origin for development

# Configure Gemini
genai.configure(api_key=os.getenv("API_KEY"))

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    messages = data.get("messages", [])
    model_name = data.get("model", "gemini-2.5-flash")

    # Initialize model
    model = genai.GenerativeModel(model_name)
    response = model.generate_content(messages)

    # Extract text
    text = ""
    for c in getattr(response, "candidates", []) or []:
        if hasattr(c, "content"):
            text += "".join(p.text for p in c.content.parts if hasattr(p, "text"))

    return jsonify({"text": text}), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
