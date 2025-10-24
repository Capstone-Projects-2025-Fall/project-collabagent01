from flask import Blueprint, jsonify, request
from src.services.ai_service import AISummaryService

api_bp = Blueprint('api', __name__)
ai_service = AISummaryService()

@api_bp.route('/summarize', methods=['POST'])
def summarize_data():
    data = request.json
    if not data or 'input' not in data:
        return jsonify({'error': 'Invalid input'}), 400
    
    summary = ai_service.summarize(data['input'])
    return jsonify({'summary': summary}), 200