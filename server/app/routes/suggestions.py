from flask import Blueprint, request
from app.services.suggestion_service import (
    getAvailableModels,
    getSuggestion,
    generate_hint_from_gemini,
    generate_explanation_from_gemini,
    check_code_correctness,
    get_suggestion_by_id,
    generate_refined_prompt,
)
from app.models.response import *
from app.models.status_codes import StatusCodes
from flasgger import swag_from

suggestions_bp = Blueprint("suggestions", __name__)


@suggestions_bp.route("/suggestion", methods=["POST"])
@swag_from(
    {
        "tags": ["Suggestions"],
        "summary": "Generate a suggestion using the AI model",
        "description": "Sends a prompt to the locally running Ollama model with an optional model name and correctness flag, returning the generated suggestion.",
        "consumes": ["application/json"],
        "produces": ["application/json"],
        "parameters": [
            {
                "name": "body",
                "in": "body",
                "required": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "example": "def add(a, b):"},
                        "vendor": {"type": "string", "example": "ollama"},
                        "model": {
                            "type": "string",
                            "example": "codellama:7b",
                            "description": "The AI model to use for generating the suggestion.",
                        },
                        "parameters": {
                            "type": "object",
                            "example": {"top_k": 0.2},
                            "description": "A flag indicating whether the suggestion should be correct.",
                        },
                    },
                    "required": ["prompt"],
                },
            }
        ],
        "responses": {
            "200": {
                "description": "Successfully generated suggestion",
                "schema": {
                    "type": "object",
                    "properties": {
                        "suggestions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "example": ["return a + b"],
                        }
                    },
                },
            },
            "400": {
                "description": "Bad Request - No prompt provided",
                "schema": {
                    "type": "object",
                    "properties": {
                        "error": {"type": "string", "example": "No prompt provided"}
                    },
                },
            },
            "500": {
                "description": "Internal Server Error - Failed to generate response",
                "schema": {
                    "type": "object",
                    "properties": {
                        "error": {"type": "string", "example": "Connection error"}
                    },
                },
            },
        },
    }
)
def generate_suggestion_route():
    """
    Generate a suggestion based on the provided prompt.
    See Swagger docs for more information.
    """
    data = request.json
    prompt = data.get("prompt", "")
    vendor_name = data.get("vendor")
    model_name = data.get("model")
    model_params = data.get("parameters")
    is_intervened = data.get("isIntervened", False)

    if not prompt:
        return error_response("No prompt provided", None, StatusCodes.BAD_REQUEST)

    try:
        # Call getSuggestion with all parameters, it will decide which model to use
        response = getSuggestion(
            prompt=prompt,
            vendor=vendor_name,
            model_name=model_name,
            is_intervened=is_intervened
        )

        print(f"Response from model: {'New Intervened' if is_intervened else response}")

        return success_response(
            "AI Suggestions",
            {"response": response if isinstance(response, list) else []},
            StatusCodes.OK,
        )

    except Exception as e:
        print(e)
        return error_response(str(e), None, StatusCodes.SERVER_ERROR)


@suggestions_bp.route("/suggestion/refine", methods=["POST"])
def refine_prompt():
    """
    Generate a refined prompt for code completion.
    """
    data = request.json
    raw_prompt = data.get("rawPrompt", "")

    if not raw_prompt:
        return error_response(
            "Missing required field: rawPrompt", None, StatusCodes.BAD_REQUEST
        )

    try:
        refined = generate_refined_prompt(raw_prompt)

        print(f"Refined prompt: {refined}")

        return success_response(
            "Prompt refined", {"refinedPrompt": refined}, StatusCodes.OK
        )

    except Exception as e:
        return error_response(str(e), None, StatusCodes.SERVER_ERROR)


@suggestions_bp.route("/suggestion/hint", methods=["POST"])
def generate_hint():
    """
    Generate a hint explaining the difference between code versions.
    """
    data = request.json
    prompt = data.get("prompt", "")
    wrong_code = data.get("wrongCode", "")
    right_code = data.get("rightCode", "")

    if not all([prompt, wrong_code, right_code]):
        print("got here")
        return error_response(
            "Missing required fields (prompt, wrongCode, rightCode)",
            None,
            StatusCodes.BAD_REQUEST,
        )

    try:
        hint = generate_hint_from_gemini(prompt, wrong_code, right_code)

        return success_response("Hint generated", {"hint": hint}, StatusCodes.OK)

    except Exception as e:
        return error_response(str(e), None, StatusCodes.SERVER_ERROR)


@suggestions_bp.route("/suggestion/explanation", methods=["POST"])
def generate_explanation():
    """
    Generate a explanation telling the user what is wrong with the 'bad code'.
    """
    data = request.json
    prompt = data.get("prompt", "")
    wrong_code = data.get("wrongCode", "")
    right_code = data.get("rightCode", "")

    if not all([prompt, wrong_code, right_code]):
        return error_response(
            "Missing required fields (prompt, wrongCode, rightCode)",
            None,
            StatusCodes.BAD_REQUEST,
        )

    try:
        explanation = generate_explanation_from_gemini(prompt, wrong_code, right_code)

        return success_response(
            "Explanation generated", {"explanation": explanation}, StatusCodes.OK
        )

    except Exception as e:
        return error_response(str(e), None, StatusCodes.SERVER_ERROR)


@suggestions_bp.route("/suggestion/answer", methods=["POST"])
def validate_fix():
    """
    Validate the user's fixed code using an AI model.
    """
    data = request.json
    prompt = data.get("prompt", "")
    wrong_code = data.get("wrongCode", "")
    fixed_code = data.get("fixedCode", "")

    if not all([prompt, wrong_code, fixed_code]):
        return error_response(
            "Missing required fields (prompt, wrongCode, fixedCode)",
            None,
            StatusCodes.BAD_REQUEST,
        )

    try:
        is_correct = check_code_correctness(prompt, wrong_code, fixed_code)

        print(f"Is the fixed code correct? {is_correct}")

        return success_response(
            "Code validation result", {"isCorrect": is_correct}, StatusCodes.OK
        )

    except Exception as e:
        return error_response(str(e), None, StatusCodes.SERVER_ERROR)


@suggestions_bp.route("/models", methods=["GET"])
@swag_from(
    {
        "tags": ["Suggestions"],
        "summary": "Get all models available from a vendor",
        "description": "Lists all models available from the selected vendor",
        "produces": ["application/json"],
        "parameters": [
            {
                "name": "vendor",
                "in": "query",  # Change from 'body' to 'query'
                "required": True,
                "type": "string",
                "example": "openai",
            }
        ],
        "responses": {
            "200": {
                "description": "List of models from the vendor",
                "schema": {
                    "type": "object",
                    "properties": {
                        "models": {"type": "array", "items": {"type": "string"}}
                    },
                },
            },
            "400": {
                "description": "Bad Request, missing vendor",
            },
            "500": {
                "description": "Internal server error",
            },
        },
    }
)
def list_models_route():
    vendor = request.args.get("vendor")  # Get vendor from query string

    if not vendor:
        return error_response(
            "Vendor not included in request", None, StatusCodes.BAD_REQUEST
        )

    try:
        models = getAvailableModels(vendor)  # Pass vendor to function
        return success_response("Models List", {"models": models})

    except Exception as e:
        return error_response(str(e), None, StatusCodes.SERVER_ERROR)


@suggestions_bp.route("/suggestion/<suggestion_id>", methods=["GET"])
@swag_from(
    {
        "tags": ["Suggestions"],
        "summary": "Get a suggestion by ID",
        "description": "Retrieves a specific suggestion using its unique identifier.",
        "parameters": [
            {
                "name": "suggestion_id",
                "in": "path",
                "required": True,
                "type": "string",
                "example": "abc123",
            }
        ],
        "responses": {
            "200": {
                "description": "Suggestion retrieved successfully",
                "schema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "prompt": {"type": "string"},
                        "suggestion": {"type": "string"},
                        "user_id": {"type": "string"},
                        "created_at": {"type": "string", "format": "date-time"},
                        # Add other fields if needed
                    },
                },
            },
            "404": {
                "description": "Suggestion not found",
                "schema": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}},
                },
            },
        },
    }
)
def get_suggestion_details(suggestion_id):
    try:
        suggestion = get_suggestion_by_id(suggestion_id)

        if not suggestion:
            return error_response(
                f"No suggestion found for id {suggestion_id}",
                None,
                StatusCodes.NOT_FOUND,
            )

        return success_response(
            f"Suggestion retrieved for id {suggestion_id}",
            suggestion.to_json(),
            StatusCodes.OK,
        )

    except Exception as e:
        return error_response(
            f"Error fetching suggestion {suggestion_id}: {e}",
            None,
            StatusCodes.SERVER_ERROR,
        )
