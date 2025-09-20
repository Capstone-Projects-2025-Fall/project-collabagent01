from app.models.errors import StatusCodes
from flask import jsonify
from app.models.status_codes import StatusCodes


def success_response(
        message: str,
        data=None,
        status_code: StatusCodes = StatusCodes.OK
):
    return jsonify({
        "status": "Success",
        "message": message,
        "data": data,
    }), status_code.value


def error_response(
        message: str,
        data=None,
        status_code: StatusCodes = StatusCodes.NOT_FOUND
):
    return jsonify({
        "status": "Error",
        "message": message,
        "data": data,
    }), status_code.value