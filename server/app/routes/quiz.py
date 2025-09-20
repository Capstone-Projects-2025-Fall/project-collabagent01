from flask import request, render_template, Blueprint, redirect, session
from app.models.response import *
from app.models.status_codes import StatusCodes
from flasgger import swag_from
from app.services.quiz_service import build_prompt_from_suggestions, generate_quiz_from_prompt
from app.controllers.database import client

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/quiz/generate', methods=['POST'])
def generate_quiz_route():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        user_class_id = data.get("user_class_id")

        print(f"Received request to generate quiz for user_id: {user_id} & user_class_id: {user_class_id}")

        if not user_id:
            return error_response(
                "Missing 'user_id' in request body.",
                None,
                StatusCodes.BAD_REQUEST
            )
        
        section_query = client.table("user_sections") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "NEED_REVIEW")

        if user_class_id == "non-class":
            section_query = section_query.is_("class_id", None)
        else:
            section_query = section_query.eq("class_id", user_class_id)

        section = section_query.limit(1).execute()
        
        if not section.data:
            return success_response(
                f"You have no sections that need review.",
                {"quiz": []},
                StatusCodes.NOT_FOUND
            )
        
        user_section_id = section.data[0]["section_id"]

        existing_questions = client.table("user_section_questions") \
            .select("*") \
            .eq("user_section_id", user_section_id) \
            .execute()
        
        if existing_questions.data:
            return success_response(
                f"Returning existing quiz for user {user_id}",
                {"quiz": existing_questions.data},
                StatusCodes.OK
            )

        prompt = build_prompt_from_suggestions(user_section_id)
        generated_quiz = generate_quiz_from_prompt(prompt)

        for quiz in generated_quiz:
            client.table("user_section_questions").insert({
                "user_section_id": user_section_id,
                "question": quiz["question"],
                "choices": quiz["choices"],
                "answer_index": quiz["answer_index"],
                "explanation": quiz["explanation"],
                "user_answer_index": None
            }).execute()

        saved_questions = client.table("user_section_questions") \
            .select("*") \
            .eq("user_section_id", user_section_id) \
            .execute()

        return success_response(
            f"Quiz successfully generated for user {user_id}",
            {"quiz": saved_questions.data},
            StatusCodes.CREATED
        )

    except Exception as e:
        return error_response(
            f"Error generating quiz: {str(e)}",
            None,
            StatusCodes.SERVER_ERROR
        )
