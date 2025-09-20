import pytest
from unittest.mock import patch, MagicMock
from app.services import user_service
from app.models.errors import DatabaseError
from datetime import datetime


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_update_user_class_status_with_class_id(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "user123"}]
    mock_client.table.return_value.update.return_value.match.return_value.execute.return_value = (
        mock_execute
    )

    user_service.update_user_class_status("user123", "ACTIVE", "class456")

    mock_client.table.assert_called_once_with("class_users")
    mock_client.table.return_value.update.assert_called_once_with(
        {"user_class_status": "ACTIVE"}
    )
    mock_client.table.return_value.update.return_value.match.assert_called_once_with(
        {"student_id": "user123", "class_id": "class456"}
    )
    mock_client.table.return_value.update.return_value.match.return_value.execute.assert_called_once()


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_update_user_class_status_with_class_id_error(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = None
    mock_client.table.return_value.update.return_value.match.return_value.execute.return_value = (
        mock_execute
    )

    with pytest.raises(DatabaseError):
        user_service.update_user_class_status("user123", "ACTIVE", "class456")

    mock_client.table.assert_called_once_with("class_users")
    mock_client.table.return_value.update.assert_called_once_with(
        {"user_class_status": "ACTIVE"}
    )
    mock_client.table.return_value.update.return_value.match.assert_called_once_with(
        {"student_id": "user123", "class_id": "class456"}
    )
    mock_client.table.return_value.update.return_value.match.return_value.execute.assert_called_once()


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_update_user_class_status_without_class_id(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "user123"}]
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    user_service.update_user_class_status("user123", "INACTIVE")

    mock_client.table.assert_called_once_with("users")
    mock_client.table.return_value.update.assert_called_once_with(
        {"status": "INACTIVE"}
    )
    mock_client.table.return_value.update.return_value.eq.assert_called_once_with(
        "id", "user123"
    )
    mock_client.table.return_value.update.return_value.eq.return_value.execute.assert_called_once()


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_update_user_class_status_without_class_id_error(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = None
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    with pytest.raises(DatabaseError):
        user_service.update_user_class_status("user123", "INACTIVE")

    mock_client.table.assert_called_once_with("users")
    mock_client.table.return_value.update.assert_called_once_with(
        {"status": "INACTIVE"}
    )
    mock_client.table.return_value.update.return_value.eq.assert_called_once_with(
        "id", "user123"
    )
    mock_client.table.return_value.update.return_value.eq.return_value.execute.assert_called_once()


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_user_class_status_success(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"user_class_status": "ACTIVE"}]
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.get_user_class_status("user123", "class456")

    assert result == {"user_class_status": "ACTIVE"}
    mock_client.table.assert_called_once_with("class_users")
    mock_client.table.return_value.select.assert_called_once_with("user_class_status")
    mock_client.table.return_value.select.return_value.eq.assert_called_with(
        "student_id", "user123"
    )
    mock_client.table.return_value.select.return_value.eq.return_value.eq.assert_called_with(
        "class_id", "class456"
    )
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.assert_called_once()


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_user_class_status_no_data(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = []
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.get_user_class_status("user123", "class456")

    assert result is None


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_create_user_section_with_class_id(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"section_id": "section123"}]
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.create_user_section("user123", "class456")

    assert result == "section123"
    mock_client.table.assert_called_once_with("user_sections")
    inserted_data = mock_client.table.return_value.insert.call_args[0][0]
    assert inserted_data["user_id"] == "user123"
    assert inserted_data["class_id"] == "class456"
    assert inserted_data["status"] == "ACTIVE"
    assert "started_at" in inserted_data


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_create_user_section_without_class_id(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"section_id": "section123"}]
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.create_user_section("user123")

    assert result == "section123"
    mock_client.table.assert_called_once_with("user_sections")
    inserted_data = mock_client.table.return_value.insert.call_args[0][0]
    assert inserted_data["user_id"] == "user123"
    assert "class_id" not in inserted_data
    assert inserted_data["status"] == "ACTIVE"
    assert "started_at" in inserted_data


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_user_section_existing(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"section_id": "section123"}]
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.get_user_section("user123", "class456")

    assert result == "section123"


@patch("app.services.user_service.create_user_section", new_callable=MagicMock)
@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_user_section_creates_new(mock_client, mock_create_user_section, app):
    mock_execute = MagicMock()
    mock_execute.data = []
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )
    mock_create_user_section.return_value = "new_section123"

    result = user_service.get_user_section("user123", "class456")

    assert result == "new_section123"
    mock_create_user_section.assert_called_once_with("user123", "class456")


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_update_user_section(mock_client, app):
    mock_execute = MagicMock()
    mock_execute.data = [{"section_id": "section123"}]
    mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    user_service.update_user_section("COMPLETE", "section123")

    mock_client.table.assert_called_once_with("user_sections")
    mock_client.table.return_value.update.assert_called_once()
    update_data = mock_client.table.return_value.update.call_args[0][0]
    assert update_data["status"] == "COMPLETE"
    assert "ended_at" in update_data
    mock_client.table.return_value.update.return_value.eq.assert_called_once_with(
        "section_id", "section123"
    )
    mock_client.table.return_value.update.return_value.eq.return_value.execute.assert_called_once()


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_classes_by_user_id_returns_classes(mock_client):
    mock_execute = MagicMock()
    mock_execute.data = [
        {
            "user_class_status": "ACTIVE",
            "classes": {"id": "class123", "name": "Math", "teacher_id": "teacher123"},
        }
    ]
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.get_classes_by_user_id("user123")

    expected = [
        {
            "userClass": {"id": "class123", "name": "Math", "teacher_id": "teacher123"},
            "studentStatus": "ACTIVE",
        }
    ]

    assert result == expected


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_classes_by_user_id_no_data(mock_client):
    mock_execute = MagicMock()
    mock_execute.data = []
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = (
        mock_execute
    )

    result = user_service.get_classes_by_user_id("user123")

    assert result == []


@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_classes_by_user_id_raises_error(mock_client):
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception(
        "DB failure"
    )

    with pytest.raises(DatabaseError) as exc_info:
        user_service.get_classes_by_user_id("user123")

    assert "Failed to retrieve user classes" in str(exc_info.value)


@patch("app.services.user_service.get_service_client", new_callable=MagicMock)
@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_all_users_merges_sources(mock_client, mock_get_service_client, app):
    # Mock database users
    mock_client.table.return_value.select.return_value.execute.return_value.data = [
        {"id": "user1", "name": "Alice"},
        {"id": "user2", "name": "Bob"},
    ]

    # Mock auth users
    mock_auth_user1 = MagicMock(
        id="user1",
        email="alice@example.com",
        created_at="2021-01-01T00:00:00Z",
        updated_at="2021-01-01T01:00:00Z",
        last_sign_in_at="2021-01-02T00:00:00Z",
        app_metadata={"providers": ["email"]},
        user_metadata={"avatar_url": "http://example.com/alice.png"},
    )
    mock_auth_user3 = MagicMock(
        id="user3",
        email="charlie@example.com",
        created_at="2021-03-01T00:00:00Z",
        updated_at="2021-03-01T01:00:00Z",
        last_sign_in_at="2021-03-02T00:00:00Z",
        app_metadata={"providers": ["github"]},
        user_metadata={"avatar_url": "http://example.com/charlie.png"},
    )
    mock_get_service_client.return_value.auth.admin.list_users.return_value = [
        mock_auth_user1,
        mock_auth_user3,
    ]

    result = user_service.get_all_users()

    assert len(result) == 3

    # Check merged user
    merged = next(u for u in result if u["id"] == "user1")
    assert merged["name"] == "Alice"
    assert merged["auth_email"] == "alice@example.com"
    assert merged["source"] == "both"

    # Check users-only
    users_only = next(u for u in result if u["id"] == "user2")
    assert users_only["name"] == "Bob"
    assert users_only["auth_email"] is None
    assert users_only["source"] == "users_only"

    # Check auth-only
    auth_only = next(u for u in result if u["id"] == "user3")
    assert auth_only["auth_email"] == "charlie@example.com"
    assert "name" not in auth_only
    assert auth_only["source"] == "auth_only"


@patch("app.services.user_service.get_service_client", new_callable=MagicMock)
@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_all_users_handles_empty_sources(mock_client, mock_get_service_client, app):
    mock_client.table.return_value.select.return_value.execute.return_value.data = []
    mock_get_service_client.return_value.auth.admin.list_users.return_value = []

    result = user_service.get_all_users()
    assert result == []


@patch(
    "app.services.user_service.get_service_client",
    side_effect=Exception("auth fail"),
    new_callable=MagicMock,
)
@patch("app.services.user_service.client", new_callable=MagicMock)
def test_get_all_users_raises_database_error(mock_client, mock_get_service_client, app):
    with pytest.raises(DatabaseError) as exc_info:
        user_service.get_all_users()
    assert "Failed to retrieve all users" in str(exc_info.value)
