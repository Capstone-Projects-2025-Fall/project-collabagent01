import pytest
from unittest.mock import patch, MagicMock
from app.services import class_service


@patch("app.services.class_service.client", new_callable=MagicMock)
def test_insert_new_class_success(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "class123"}]
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_execute
    )

    class_data = {
        "classTitle": "Math 101",
        "classCode": "MATH101",
        "instructorId": "instructor1",
        "classHexColor": "#ffffff",
        "classImageCover": "image.png",
        "classDescription": "Intro to Math",
    }

    result = class_service.insert_new_class(class_data)

    assert result["id"] == "class123"
    mock_client.table.assert_called_once_with("classes")


@patch("app.services.class_service.client", new_callable=MagicMock)
def test_insert_new_class_failure(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = None
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_execute
    )

    class_data = {
        "classTitle": "Math 101",
        "classCode": "MATH101",
        "instructorId": "instructor1",
        "classHexColor": "#ffffff",
    }

    with pytest.raises(
        Exception, match="Failed to insert new class into the database."
    ):
        class_service.insert_new_class(class_data)


@patch("app.services.class_service.client", new_callable=MagicMock)
def test_fetch_classes_by_instructor_success(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "class123"}, {"id": "class456"}]
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    result = class_service.fetch_classes_by_instructor("instructor1")

    assert len(result) == 2
    assert result[0]["id"] == "class123"
    mock_client.table.assert_called_once_with("classes")


@patch("app.services.class_service.client", new_callable=MagicMock)
def test_fetch_classes_by_instructor_failure(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = None
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    with pytest.raises(
        Exception, match="Failed to retrieve classes for the given instructor."
    ):
        class_service.fetch_classes_by_instructor("instructor1")


@patch("app.services.class_service.client", new_callable=MagicMock)
def test_insert_class_user_success(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "join123"}]
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_execute
    )

    result = class_service.insert_class_user("student1", "class1")

    assert result["id"] == "join123"
    mock_client.table.assert_called_once_with("class_users")


@patch("app.services.class_service.client", new_callable=MagicMock)
def test_insert_class_user_failure(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = None
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_execute
    )

    with pytest.raises(Exception, match="Failed to register user to class."):
        class_service.insert_class_user("student1", "class1")
