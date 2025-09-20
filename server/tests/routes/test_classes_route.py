import pytest
from unittest.mock import patch, MagicMock

def test_create_class_sucess(client):
    mock_class = {
        "classTitle": "Math 101",
        "classCode": "MATH101",
        "instructorId": 1,
        "classHexColor": "#FF5733"
    }
    
    with patch('app.routes.classes.insert_new_class', return_value=mock_class) as mock_insert:
        response = client.post('/classes/create', json=mock_class)
        
        assert response.status_code == 201
        assert response.json['message'] == "Class created successfully"
        assert response.json['data'] == mock_class
        mock_insert.assert_called_once_with(mock_class)

def test_create_class_missing_fields(client):
    mock_class = {
        "classTitle": "Math 101",
        "classCode": "MATH101",
        "instructorId": 1
    }
    
    response = client.post('/classes/create', json=mock_class)
    
    assert response.status_code == 400
    assert response.json['message'] == "Missing required fields: classHexColor"

def test_create_class_unknown_error(client):
    mock_class = {
        "classTitle": "Math 101",
        "classCode": "MATH101",
        "instructorId": 1,
        "classHexColor": "#FF5733"
    }
    
    with patch('app.routes.classes.insert_new_class', side_effect=Exception("Database error")) as mock_insert:
        response = client.post('/classes/create', json=mock_class)
        
        assert response.status_code == 500
        assert response.json['message'] == "Error creating class: Database error"
        mock_insert.assert_called_once_with(mock_class)

def test_get_classes_by_intructor_success(client):
    mock_classes = [
        {
            "classId": 1,
            "classTitle": "Math 101",
            "classCode": "MATH101",
            "instructorId": 1,
            "classHexColor": "#FF5733"
        },
        {
            "classId": 2,
            "classTitle": "Science 101",
            "classCode": "SCI101",
            "instructorId": 1,
            "classHexColor": "#33FF57"
        }
    ]
    
    with patch('app.routes.classes.fetch_classes_by_instructor', return_value=mock_classes) as mock_fetch:
        response = client.get('/classes/instructor/1')
        
        assert response.status_code == 200
        assert response.json['message'] == "Found 2 class(es) for instructor 1"
        assert response.json['data'] == mock_classes
        mock_fetch.assert_called_once_with("1")

def test_get_classes_by_intructor_unknown_error(client):
    with patch('app.routes.classes.fetch_classes_by_instructor', side_effect=Exception("Database error")) as mock_fetch:
        response = client.get('/classes/instructor/1')
        
        assert response.status_code == 500
        assert response.json['message'] == "Error fetching classes: Database error"
        mock_fetch.assert_called_once_with("1")

def test_register_user_to_class_success(client):
    mock_registration = {
        "studentId": 1,
        "classId": 1
    }
    
    with patch('app.routes.classes.insert_class_user', return_value=mock_registration) as mock_insert:
        response = client.post('/classes/register', json=mock_registration)
        
        assert response.status_code == 201
        assert response.json['message'] == "Class registration successful"
        assert response.json['data'] == mock_registration
        mock_insert.assert_called_once_with(1, 1)

def test_register_user_to_class_missing_fields(client):
    mock_registration = {
        "studentId": 1
    }
    
    response = client.post('/classes/register', json=mock_registration)
    
    assert response.status_code == 400
    assert response.json['message'] == "Missing required fields: classId"

def test_register_user_to_class_unknown_error(client):
    mock_registration = {
        "studentId": 1,
        "classId": 1
    }
    
    with patch('app.routes.classes.insert_class_user', side_effect=Exception("Database error")) as mock_insert:
        response = client.post('/classes/register', json=mock_registration)
        
        assert response.status_code == 500
        assert response.json['message'] == "Error registering to class: Database error"
        mock_insert.assert_called_once_with(1, 1)