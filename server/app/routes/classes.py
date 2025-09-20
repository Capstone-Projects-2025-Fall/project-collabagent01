from flask import Blueprint, request
from app.models.status_codes import StatusCodes
from app.models.response import *
from app.services.class_service import insert_new_class, insert_class_user, fetch_classes_by_instructor

classes_bp = Blueprint('classes', __name__)

@classes_bp.route('/classes/create', methods=['POST'])
def create_class():
    data = request.json

    required_fields = ['classTitle', 'classCode', 'instructorId', 'classHexColor']
    missing_fields = [field for field in required_fields if field not in data]

    if missing_fields:
        return error_response(
            f"Missing required fields: {', '.join(missing_fields)}",
            None,
            StatusCodes.BAD_REQUEST
        )

    try:
        new_class = insert_new_class(data)
        return success_response(
            "Class created successfully",
            new_class,
            StatusCodes.CREATED
        )
    except Exception as e:
        return error_response(
            f"Error creating class: {str(e)}",
            None,
            StatusCodes.SERVER_ERROR
        )
    
@classes_bp.route('/classes/instructor/<instructor_id>', methods=['GET'])
def get_classes_by_instructor(instructor_id):
    try:
        classes = fetch_classes_by_instructor(instructor_id)
        return success_response(
            f"Found {len(classes)} class(es) for instructor {instructor_id}",
            classes,
            StatusCodes.OK
        )
    except Exception as e:
        return error_response(
            f"Error fetching classes: {str(e)}",
            None,
            StatusCodes.SERVER_ERROR
        )
    
@classes_bp.route('/classes/register', methods=['POST'])
def register_user_to_class():
    data = request.json
    required_fields = ['studentId', 'classId']
    missing_fields = [field for field in required_fields if field not in data]

    if missing_fields:
        return error_response(
            f"Missing required fields: {', '.join(missing_fields)}",
            None,
            StatusCodes.BAD_REQUEST
        )

    try:
        new_registration = insert_class_user(data['studentId'], data['classId'])
        return success_response(
            "Class registration successful",
            new_registration,
            StatusCodes.CREATED
        )
    except Exception as e:
        return error_response(
            f"Error registering to class: {str(e)}",
            None,
            StatusCodes.SERVER_ERROR
        )

