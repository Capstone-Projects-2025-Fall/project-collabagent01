import pytest
from unittest.mock import patch
from app import create_app
from app.models.status_codes import StatusCodes



def test_get_user_success(client):
    mock_user = type('User', (), {"to_json": lambda self: {"id": "123", "name": "Test User", "email": "test@example.com"}})()
    with patch('app.routes.user.get_user_by_id', return_value=mock_user):
        response = client.get('/users/123')
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["id"] == "123"


def test_get_user_not_found(client):
    with patch('app.routes.user.get_user_by_id', return_value=None):
        response = client.get('/users/999')
        assert response.status_code == 404
        data = response.get_json()
        assert "User not found" in data["message"]


def test_update_user_status_success(client):
    with patch('app.routes.user.update_user_class_status') as mock_update:
        response = client.put('/users/123/status', json={"status": "ACTIVE", "userClassId": "class-1"})
        assert response.status_code == 200
        mock_update.assert_called_once()


def test_update_user_status_invalid_status(client):
    response = client.put('/users/123/status', json={"status": "INVALID", "userClassId": "class-1"})
    assert response.status_code == 400


def test_get_user_class_status_success(client):
    with patch('app.routes.user.get_user_class_status', return_value="ACTIVE"):
        response = client.get('/users/123/class-status?userClassId=class-1')
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"] == {"user_class_status": "ACTIVE"}


def test_get_user_class_status_not_found(client):
    with patch('app.routes.user.get_user_class_status', return_value=None):
        response = client.get('/users/123/class-status?userClassId=class-999')
        assert response.status_code == 404


def test_create_user_section_success(client):
    with patch('app.routes.user.create_user_section', return_value=True):
        response = client.post('/users/123/sections', json={"sectionId": "section-1"})
        assert response.status_code == 201


def test_get_user_sections_success(client):
    with patch('app.routes.user.get_user_section', return_value="section-1"):
        response = client.get('/users/123/sections')
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["user_section_id"] == "section-1"


def test_update_user_section_status_success(client):
    with patch('app.routes.user.update_user_section') as mock_update:
        response = client.put('/users/123/sections', json={"status": "COMPLETE", "userSectionId": "section-1"})
        assert response.status_code == 200
        mock_update.assert_called_once()


def test_update_user_section_status_invalid_status(client):
    response = client.put('/users/123/sections', json={"status": "INVALID", "userSectionId": "section-1"})
    assert response.status_code == 400


def test_update_user_section_status_missing_id(client):
    response = client.put('/users/123/sections', json={"status": "ACTIVE"})
    assert response.status_code == 400


def test_update_user_settings_success(client):
    with patch('app.routes.user.update_user_settings') as mock_update:
        response = client.put('/users/123/settings', json={"notifications": True})
        assert response.status_code == 200
        mock_update.assert_called_once()


def test_update_user_settings_missing_settings(client):
    response = client.put('/users/123/settings', json={})
    assert response.status_code == 400


def test_get_user_classes_success(client):
    with patch('app.routes.user.get_classes_by_user_id', return_value=[{"classId": "class-1"}]):
        response = client.get('/users/123/classes')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data["data"], list)


def test_get_users_success(client):
    with patch('app.routes.user.get_all_users', return_value=[{"id": "123", "name": "Test User", "email": "test@example.com"}]):
        response = client.get('/users')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data["data"], list)


def test_delete_user_success(client):
    with patch('app.routes.user.delete_user', return_value=None) as mock_delete:
        response = client.delete(f'/users/123')
        
        assert response.status_code == 200
        assert response.json['data'] == True
        mock_delete.assert_called_once_with("123")


def test_update_user_success(client):
    with patch('app.routes.user.edit_user') as mock_update:
        response = client.put('/users/123', json={"name": "Updated User"})
        assert response.status_code == 200
        mock_update.assert_called_once()


def test_update_user_missing_data(client):
    response = client.put('/users/123', json={})
    assert response.status_code == 400