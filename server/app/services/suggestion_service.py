from app.controllers.ai import (
    openai_client,
    gemini_client,
    vendors,
    good_command,
    bad_command,
    OLLAMA_URL,
    default_openai_parameters,
)
from app.controllers.database import client
from app.models.errors import ModelError, DatabaseError
import requests
from flask import current_app
import time
import json
from app.models.user import Suggestion
import traceback
import logging


def getSuggestion(
    prompt: str,
    vendor: str = vendors.Google,
    model_name: str = "codellama",
    model_params: dict = None,
    is_intervened: bool = False
):
    """
    Handles suggestions from different models based on the provided model name.

    Args:
        prompt (str): The prompt (or piece of code) to generate suggestions from.
        vendor (str): The vendor of the AI model(OpenAI, Ollama, Google)
        model_name (str): The model to use( See vendor website).
        model_params (dict): Additional parameters to be sent to the AI.
        is_correct (bool): Whether to generate a correct suggestion or one with a small error.

    Returns:
        dict: A dictionary containing the suggestion response.

    Raises:
        Exception: If there is an error with the model API.
    """

    try:
        vendor_enum = vendors(vendor)  # Convert string to Enum
    except ValueError:
        vendor_enum = vendors.Google  # Default if invalid

    # Choose model-specific logic
    match vendor_enum:
        case vendors.OpenAI:
            return getSuggestionFromOpenAI(
                prompt=prompt,
                model=model_name,
            )
        case vendors.Ollama:
            return getSuggestionFromOllama(
                prompt=prompt,
                model_name=model_name,
            )
        case vendors.Google:
            if is_intervened:
                return getIntervenedSuggestionsFromGoogle(prompt)
            else:
                return getSuggestionFromGoogle(
                    prompt=prompt,
                )
        case _:
            return getSuggestionFromGoogle(
                prompt=prompt,
            )

def getIntervenedSuggestionsFromGoogle(prompt: str):
    """
    Generates code suggestions with intervention format:
    [{ mainLine: str, fixedLine?: str, hasBug: bool }]
    """

    full_prompt = f"""You are a code completion assistant.

    You must return ONLY the missing lines needed to complete the given partial code fragment. 
    Your response must be a JSON array of line objects in the following format:

    {{ "mainLine": string, "fixedLine"?: string, "hasBug": boolean }}

    Instructions:
    - Think of this as GitHub Copilot: continue the code from where the prompt ends.
    - Each object represents **one new line** in the code block.
    - Exactly ONE line must contain a small logic bug — include its correction in "fixedLine".
    - All other lines must be correct, with `"hasBug": false` and no "fixedLine".
    - Your total output should represent the **completion only**, not a full function if part of it already exists.
    - DO NOT include or repeat the prompt.
    - DO NOT wrap your output in markdown or add explanations.
    - Each line must end in a newline character (\\n).
    - Output a valid JSON array only.

    Example input:
    function max(a, b) {{
    if (a > b)\\n

    Example output:
    [
    {{ "mainLine": "    return a;\\n", "hasBug": false }},
    {{ "mainLine": "  else {{\\n", "hasBug": false }},
    {{ "mainLine": "    return a;\\n", "fixedLine": "    return b;\\n", "hasBug": true }},
    {{ "mainLine": "  }}\\n", "hasBug": false }},
    {{ "mainLine": "}}\\n", "hasBug": false }}
    ]

    ACTUAL CODE TO COMPLETE:
    {prompt}

    ONLY return valid JSON:
    """
  
    try:
        response = gemini_client.chat_session.send_message(full_prompt)

        if not response.text:
            return []

        result = json.loads(response.text)
        if isinstance(result, list):
            return result
        return []

    except Exception as e:
        logging.exception("Error during intervened suggestion generation: %s", e)
        return []


def getSuggestionFromOpenAI(
    prompt: str,
    model: str = "gpt-4o-mini",
    model_params: dict = None,
    is_correct: bool = True,
):
    """
    Completes a code suggestion using OpenAI's API.
    """

    try:
        # Ensure model_params is a dictionary
        if model_params is None:
            model_params = default_openai_parameters  # Use a default config

        if is_correct:
            system_message = """You are an AI coding assistant. Your goal is to autocomplete and extend the user's code seamlessly, predicting what they are likely to write next.

                                Follow these rules explicitly:
                                - Provide only the completion—no explanations, comments, or markdown formatting.
                                - Base your predictions on best practices, patterns, and context from the given code.
                                - Aim for concise and efficient solutions that align with the user's coding style.
                                - Always act as if you are an inline code completion tool, not a chatbot.
                                - Avoid markdown or any extra formatting.
                                - Never repeat the user or their code, continue exactly where they left off."""
        else:
            system_message = """You are an AI coding assistant. Your goal is to autocomplete and extend the user's code seamlessly, predicting what they are likely to write next.

                    Follow these rules explicitly:
                    - Provide only the completion—no explanations, comments, or markdown formatting.
                    - Base your predictions on best practices, patterns, and context from the given code.
                    - Aim for concise and efficient solutions that align with the user's coding style.
                    - Always act as if you are an inline code completion tool, not a chatbot.
                    - Avoid markdown or any extra formatting.
                    - Never repeat the user or their code, continue exactly where they left off.
                    
                    This suggestions should be slightly incorrect. Insert a incorrect change, like a syntactical mistake or misnaming a variable."""

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]
        with current_app.app_context():
            completion = openai_client.chat.completions.create(
                temperature=model_params.get("temperature"),
                top_p=model_params.get("top_p"),
                max_tokens=model_params.get("max_tokens"),
                model=model,
                messages=messages,
            )

            suggestion = completion.choices[0].message.content.strip("```")
            suggestion = completion.choices[0].message.content.lstrip(prompt)

            return suggestion

    except Exception as e:
        print(f"Error generating suggestion using OpenAI's API: {e}")
        raise ModelError(f"Error generating suggestion using OpenAI's API: {e}")


def getSuggestionFromOllama(
    prompt: str,
    model_name: str,
    is_correct: bool = True,
):
    """
    Generates a suggestion from Ollama.
    """

    full_prompt = (good_command if is_correct else bad_command) + prompt

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": model_name,
                "prompt": full_prompt,
                "keep_alive": "1h",
                "stream": False,
            },
        )
        response.raise_for_status()  # Raise exception for HTTP errors
        result = response.json()
        return result["response"]

    except Exception as e:
        print(f"Error fetching Ollama suggestion: {e}")
        raise ModelError(f"Error fetching Ollama suggestion: {e}")


def getSuggestionFromGoogle(
    prompt: str,
):
    """
    Sends the prompt to the model and returns an array of two code snippets:
    one correct and one with a small logic error.

    Args:
        prompt (str): The code snippet to complete (e.g., "function add").

    Returns:
        list[str]: An array containing two code snippets.
    """

    full_prompt = f"""You are a code completion assistant that returns ONLY a JSON array with exactly 2 elements:
    1. Correct completion of the EXACT code fragment provided
    2. Same completion but with a small logical error

    RULES:
    - STRICTLY return ONLY a valid JSON array (no other text, markdown, or explanations)
    - ONLY provide the missing part needed to complete the EXACT code fragment
    - DO NOT repeat or rewrite the existing code
    - Ensure the completion is syntactically correct
    - Maintain the exact same indentation as the original

    EXAMPLE INPUT: 
    function add(a, b) {{\n  return a

    EXAMPLE OUTPUT:
    [" + b;", " - b;"]

    ACTUAL CODE TO COMPLETE:
    {prompt}

    ONLY RETURN THE MISSING PART AS SHOWN IN THE EXAMPLE:"""

    try:
        start_time = time.time()

        response = gemini_client.chat_session.send_message(full_prompt)

        latency = time.time() - start_time

        if not response.text:
            return []

        if response.usage_metadata:
            usage_metadata = response.usage_metadata
            input_tokens = usage_metadata.prompt_token_count
            output_tokens = usage_metadata.candidates_token_count
            total_tokens = usage_metadata.total_token_count
        else:
            input_tokens = output_tokens = total_tokens = -1

        data = {
            "provider": "google",
            "model": "gemini-2.0-flash",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "latency_seconds": latency,
        }

        client.table("ai_usage").insert(data).execute()

        try:
            result = json.loads(response.text)
            if isinstance(result, list):
                return result
            return []
        except json.JSONDecodeError:
            logging.error("Final JSON parse failed. Raw response: %s", response.text)
            return []

    except Exception as e:
        logging.exception(
            "Error communicating with Gemini (Type: %s): %s", type(e).__name__, e
        )
        return []


def getAvailableModels(vendor: vendors):
    vendor_enum = vendors(vendor)

    # Choose model-specific logic
    match vendor_enum:
        case vendors.OpenAI:
            return getModelsFromOpenAI()
        case vendors.Ollama:
            return getModelsFromOllama()
        case vendors.Google:
            return getModelsFromGoogle()
        case _:
            raise ValueError(f"Unsupported vendor: {vendor}")


def getModelsFromOpenAI():
    try:
        with current_app.app_context():
            models = openai_client.models.list()  # Fetch models from OpenAI API
            model_names = [model.id for model in models.data]  # Extract model names
            return model_names

    except Exception as e:
        raise e


def getModelsFromOllama():
    try:
        response = requests.get("http://localhost:11434/api/tags")

        response.raise_for_status()

        models = response.json()
        print(models)

        model_names = models.get("models", [])

        return model_names

    except requests.exceptions.RequestException as e:
        raise Exception(f"Error fetching models from Ollama: {e}")


def getModelsFromGoogle():
    models_for_generate_content = []

    for m in gemini_client.models.list():
        if "generateContent" in m.supported_actions:
            models_for_generate_content.append(m.name)

    return models_for_generate_content


def generate_refined_prompt(raw_prompt: str) -> str:
    """
    Uses AI to transform a raw code prompt into a well-structured completion request.
    Returns just the refined prompt string.
    """

    prompt = f"""Refine the following input prompt by analyzing the code and generating a minimal, specific instruction for code completion.

    Original Input:
    {raw_prompt}

    Rules:
    1. Identifies the exact code portion needing completion
    2. Describe what it should do in 1-2 sentence
    3. Provides minimal but essential context
    4. Don't return an array
    5. Follows this format:
        '''
        Language: [detected language]
        Context: 1-2 sentence description
        '''
    6. Example format:
        "Language": "javascript",
        "Context": "Complete the cube function",
    """

    try:
        response = gemini_client.chat_session.send_message(prompt)
        return response.text.strip()
    except Exception as e:
        raise ValueError(f"AI prompt refinement failed: {str(e)}")


def generate_hint_from_gemini(prompt: str, wrong_code: str, right_code: str) -> str:
    """
    Generates a hint explaining the difference between wrong and right code.

    Args:
        prompt: Original user prompt/context
        wrong_code: The incorrect code version
        right_code: The correct code version

    Returns:
        str: Explanation/hint about what's wrong with the incorrect version
    """
    hint_prompt = f"""You are a helpful coding assistant that explains subtle code differences.
    
    Context: {prompt}
    
    Incorrect Version:
    {wrong_code}
    
    Correct Version:
    {right_code}
    
    Generate a helpful hint that:
    1. Explains why the incorrect version might be wrong
    2. Gives a clue about the issue without revealing the solution
    3. Focuses on the logical error, not syntax
    4. Is concise (1-2 sentences)
    
    Example Response:
    "This version uses the wrong operator. Consider whether you should be combining or comparing the values."
    
    Your hint:"""

    try:
        response = gemini_client.chat_session.send_message(hint_prompt)
        return response.text.strip()
    except Exception as e:
        return f"Could not generate hint: {str(e)}"


def generate_explanation_from_gemini(
    prompt: str, wrong_code: str, right_code: str
) -> str:
    """
    Generates a explanation telling the user why the suggested code was wrong.

    Args:
        prompt: Original user prompt/context
        wrong_code: The incorrect code version
        right_code: The correct code version

    Returns:
        str: Explanation about what's wrong with the incorrect version
    """
    hint_prompt = f"""You are a helpful coding assistant that explains subtle code differences.
    
    Context: {prompt}
    
    Incorrect Version:
    {wrong_code}
    
    Correct Version:
    {right_code}
    
    Generate an explanation for the user that explains what is wrong the "Incorrect" version of the code, and why they should
    use the "Correct" version of the code. Avoid using markdown or any formatting. Be informative but concise."""

    try:
        response = gemini_client.chat_session.send_message(hint_prompt)
        return response.text.strip()
    except Exception as e:
        return f"Could not generate explanation: {str(e)}"


def check_code_correctness(prompt: str, wrong_code: str, fixed_code: str) -> bool:
    """
    Uses an AI model to determine whether the fixed code is correct.

    Args:
        prompt: The original user prompt/context.
        wrong_code: The incorrect code submitted.
        fixed_code: The corrected version.

    Returns:
        bool: True if the fix is correct, False otherwise.
    """
    validation_prompt = f"""You are a code review assistant.
    
    Context: {prompt}

    Incorrect Version:
    {wrong_code}

    Fixed Version:
    {fixed_code}

    Does the fixed version fully correct the mistake in the incorrect version? 
    Respond with only 'true' or 'false'."""

    try:
        response = gemini_client.chat_session.send_message(validation_prompt)
        return response.text.strip().lower() == "true"
    except Exception as e:
        print(f"Error validating code fix: {e}")
        return False


def get_suggestion_by_id(suggestion_id: str):
    try:
        response = (
            client.table("suggestions")
            .select("*")
            .eq("id", suggestion_id)
            .single()
            .execute()
        )

        if not response.data:
            return None

        return Suggestion(**response.data)

    except Exception as e:
        logging.error(f"Error fetching suggestion {suggestion_id}: {e}")
        raise DatabaseError(f"Failed to retrieve suggestion: {str(e)}")
