import json
from app.controllers.database import client
from app.controllers.ai import gemini_client
from app.models.errors import DatabaseError
import re

def build_prompt_from_suggestions(user_section_id: str) -> str:
    try:
        result = client.table("suggestions").select("prompt, suggestion_array")\
            .eq("user_section_id", user_section_id).execute()

        if not result.data:
            raise ValueError(f"No suggestions found for section {user_section_id}")

        prompt_parts = [
            f"Prompt: {item['prompt']}\nAnswer: {item['suggestion_array']}" for item in result.data
        ]

        full_prompt = "\n\n".join(prompt_parts)

        return f"""Generate a quiz based on the following context. 
        Each question should be multiple choice (a, b, c, d) with only one correct answer.
        Include the correct answer index and a brief explanation.

        Context:
        {full_prompt}
        """
    except Exception as e:
        raise DatabaseError(f"Failed to build prompt: {str(e)}")
    
def generate_quiz_from_prompt(prompt: str):
    full_prompt = f"""Generate a programming quiz with EXACTLY these specifications:

    1. Create 10 multiple-choice questions about JavaScript functions
    2. Only use CORRECT code examples from this context:
    {prompt}

    3. For each question provide:
      - A clear question
      - 4 answer choices (1 correct, 3 plausible incorrect)
      - answer_index (0-3)
      - A 1-sentence explanation

    4. Format the response as VALID JSON array with this EXACT structure:
    [
      {{
        "question": "text",
        "choices": ["a", "b", "c", "d"],
        "answer_index": 0,
        "explanation": "text"
      }},
      // 9 more questions
    ]

    5. Important rules:
      - Only show proper implementations in questions
      - Test knowledge of correct patterns
      - No markdown or backticks
      - Ensure JSON is valid (no trailing commas)

    Example of ONE question (you must provide 10):
    {{
        "question": "What is the correct implementation to square a number?",
        "choices": [
            "function square(n) {{ return n + n; }}",
            "function square(n) {{ return n * n; }}", 
            "function square(n) {{ return Math.pow(n, 3); }}",
            "function square(n) {{ return n / n; }}"
        ],
        "answer_index": 1,
        "explanation": "Squaring requires multiplying the number by itself"
    }}
    """

    response = gemini_client.chat_session.send_message(full_prompt)

    try:
        try:
            quiz = json.loads(response.text.strip())
        except json.JSONDecodeError as e:
            # Clean the response by removing trailing commas
            cleaned_text = re.sub(r',\s*([}\]])', r'\1', response.text)
            try:
                quiz = json.loads(cleaned_text.strip())
            except json.JSONDecodeError:
                # Fallback: extract the array from a larger response
                match = re.search(r'\[\s*{.*?}\s*\]', cleaned_text, re.DOTALL)
                if not match:
                    raise ValueError("No valid JSON array found in Gemini response.")
                quiz = json.loads(match.group(0))

        if not isinstance(quiz, list) or len(quiz) != 10:
            raise ValueError(f"Expected a list of 10 quiz questions, got {len(quiz)}")

        # Validate structure of each question
        required_keys = {"question", "choices", "answer_index", "explanation"}
        for i, q in enumerate(quiz):
            if not all(k in q for k in required_keys):
                raise ValueError(f"Question {i+1} is missing required fields")
            if not isinstance(q["choices"], list) or len(q["choices"]) != 4:
                raise ValueError(f"Question {i+1} should have exactly 4 choices")
            if not isinstance(q["answer_index"], int) or not 0 <= q["answer_index"] < 4:
                raise ValueError(f"Question {i+1} has invalid answer_index")

        return quiz
    except Exception as e:
        raise ValueError(f"Failed to parse Gemini quiz response: {e}")

