from flask import render_template, Blueprint, send_file
from app.models.response import error_response
from app.models.status_codes import StatusCodes
from app.services.log_service import get_all_data_from_db
import tempfile
import json

main_page_bp = Blueprint('main_page', __name__)

@main_page_bp.route('/')
def main_page_route():
    """
    Displays test AI input page
    """
    try:
        return render_template('index.html')
    except Exception as e:
        return error_response(
            f"Error loading page {e}",
            StatusCodes.SERVER_ERROR
        )
    
@main_page_bp.route('/download')
def download_route():
    try:
        return send_file('files/clover-latest.vsix', as_attachment=True) 
    except Exception as e:
        return error_response(
            f"Error loading page {e}",
            StatusCodes.SERVER_ERROR
        )
    

@main_page_bp.route('/export', methods=['GET'])
def get_all_data():
    """
    Retrieve all data from the database.
    """
    try:
        data = get_all_data_from_db()
        json_data = json.dumps(data, indent=4)

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as temp_file:
            temp_file.write(json_data)
            temp_file_path = temp_file.name
        return send_file(
            temp_file_path,
            as_attachment=True,
            download_name='data.json',
            mimetype='application/json'
        )
    
    except Exception as e:
        return error_response(
            f"Error fetching all data: {e}",
            None,
            StatusCodes.SERVER_ERROR
        )