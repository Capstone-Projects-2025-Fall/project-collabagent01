import pytest
from unittest.mock import patch
import json


def test_health_check(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'Success'


@patch('app.routes.logging.log_event')
def test_log_event_success(mock_log_event, client):
    mock_log_event.return_value = None
    response = client.post('/logs', json={
        'event': 'User logged in',
        'metadata': {'userID': 1, 'time_lapse': 1234},
        'time_lapse': 1234
    })
    assert response.status_code == 201
    assert response.json['status'] == 'Success'


def test_log_event_missing_fields(client):
    response = client.post('/logs', json={
        'metadata': {'userID': 1}
    })
    assert response.status_code == 400
    assert 'Missing required fields' in response.json['message']


@patch('app.routes.logging.get_all_logs')
def test_get_all_logs_success(mock_get_all_logs, client):
    mock_get_all_logs.return_value = [{'event': 'login'}]
    response = client.get('/logs')
    assert response.status_code == 200
    assert response.json['status'] == 'Success'


@patch('app.routes.logging.get_logs_by_user')
def test_get_logs_by_user_success(mock_get_logs_by_user, client):
    mock_get_logs_by_user.return_value = [{'event': 'user_event'}]
    response = client.get('/logs/123')
    assert response.status_code == 200
    assert response.json['status'] == 'Success'


@patch('app.routes.logging.get_logs_by_class')
def test_get_logs_by_class_success(mock_get_logs_by_class, client):
    mock_get_logs_by_class.return_value = [{'event': 'class_event'}]
    response = client.get('/logs/class/456')
    assert response.status_code == 200
    assert response.json['status'] == 'Success'


@patch('app.routes.logging.log_suggestion')
def test_log_suggestion_success(mock_log_suggestion, client):
    mock_log_suggestion.return_value = {'id': 'suggestion_id'}
    response = client.post('/logs/suggestion', json={
        'prompt': 'function add(a, b)',
        'suggestionArray': [{'text': '{ return a+b; }'}],
        'hasBug': False,
        'model': 'gemini-2.0-flash-lite',
        'userSectionId': '123'
    })
    assert response.status_code == 201
    assert response.json['status'] == 'Success'


def test_log_suggestion_missing_fields(client):
    response = client.post('/logs/suggestion', json={
        'prompt': 'function add(a, b)'
    })
    assert response.status_code == 400
    assert 'Missing required fields' in response.json['message']


@patch('app.routes.logging.get_ai_usage')
def test_ai_usage_success(mock_get_ai_usage, client):
    mock_get_ai_usage.return_value = {'usage': 123}
    response = client.get('/logs/ai')
    assert response.status_code == 200
    assert response.json['status'] == 'Success'