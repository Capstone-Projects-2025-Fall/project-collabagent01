from openai import OpenAI
from flask import current_app, g
from enum import Enum
from werkzeug.local import LocalProxy
import google.generativeai as genai



OLLAMA_URL = "http://localhost:11434/api/generate"  
DEFAULT_MODEL_NAME = "codellama:7b"

# system command to create a special AI model
# {
#     "name": "copilot-style-codellama",
#     "from": "codellama",
#     "system": "You are an AI assistant that provides code completions similar to GitHub Copilot. However, when specified you will need to respond with small errors that are left for the user to detect. Never point these errors out in any way. Your responses should be concise and continue the user's code seamlessly. Please follow all of the commands when giving completions. SYSTEM: Only respond with the code following the prompt, SYSTEM: Avoid pointing out mistakes, SYSTEM: Respond in only plane text, SYSTEM: Avoid including text describing or explaining the code mistake at all, SYSTEM: Provide comments only where necessary, SYSTEM: Avoid providing additional information, SYSTEM: If the prompt asks for an error, introduce a small syntax or logic mistake in the code. Do not explain or provide any extra context.",
#     "parameters": {
#         "temperature": 0.2,
#         "top_k": 50
#     }
# }

commands = [
    "SYSTEM: Only respond with the code following the prompt.",
    "SYSTEM: Avoid pointing out mistakes.",
    "SYSTEM: Respond in only plane text.",
    "SYSTEM: Avoid including text describing or explaining the code mistake at all",
    "SYSTEM: Provide comments only where necessary.",
    "SYSTEM: Avoid providing additional information.",
    "SYSTEM: If the prompt asks for an error, introduce a small syntax or logic mistake in the code. Do not explain or provide any extra context."
]

good_command = "SYSTEM: Complete the following code:"
bad_command = "SYSTEM: Complete the following code but introduce a small syntax or logic mistake:"




class vendors(Enum):
    OpenAI = "openai"
    Ollama = "ollama"
    Google = "google"

default_openai_parameters = {
    "temperature": 0.2,
    "top_p": 1,
    "top_k": 1,
    "max_tokens": 256,
}

def get_openai():
    with current_app.app_context():
        if "ai" not in g:
            g.ai = OpenAI(api_key=current_app.config["OPENAI_API_KEY"])
        return g.ai
def get_gemini():
    if "gemini" not in g:
        genai.configure(api_key=current_app.config["GEMINI_API_KEY"])
        # Create the model
        generation_config = {
            "temperature": 0.7,
            "response_mime_type": "application/json",
        }
        g.gemini = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config,
        )
        g.gemini.chat_session = g.gemini.start_chat(
            history=[]
        )
    return g.gemini
    
openai_client = LocalProxy(get_openai)
gemini_client = LocalProxy(get_gemini)