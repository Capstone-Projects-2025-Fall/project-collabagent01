import pytest
from unittest.mock import MagicMock, patch
from flask import session

import app.services.auth_service as auth_service


@patch("app.services.auth_service.client", new_callable=MagicMock)
def test_login_with_provider(mock_client, app):
    mock_client.auth.sign_in_with_oauth.return_value = {"url": "mock_url"}
    provider = "github"

    with app.test_request_context():
        with patch.object(session, "clear") as mock_clear:
            result = auth_service.login_with_provider(provider)

    mock_clear.assert_called_once()
    mock_client.auth.sign_in_with_oauth.assert_called_once_with(
        {
            "provider": provider,
            "options": {"redirect_to": auth_service.AUTH_URL},
        }
    )
    assert result["url"] == "mock_url"


@patch("app.services.auth_service.client", new_callable=MagicMock)
def test_login_with_email(mock_client, app):
    mock_client.auth.sign_in_with_password.return_value = {"session": "mock_session"}

    with app.test_request_context():
        with patch.object(session, "clear") as mock_clear:
            result = auth_service.login_with_email("test@example.com", "password123")

    mock_clear.assert_called_once()
    mock_client.auth.sign_in_with_password.assert_called_once_with(
        {
            "email": "test@example.com",
            "password": "password123",
        }
    )
    assert result["session"] == "mock_session"


# @patch("app.services.auth_service.client", new_callable=MagicMock)
# def test_callback_success(mock_client, app):
#     mock_client.auth.exchange_code_for_session.return_value = {
#         "session": "mock_session"
#     }
#     result, _ = auth_service.callback("auth_code_123")

#     mock_client.auth.exchange_code_for_session.assert_called_once_with(
#         {"auth_code": "auth_code_123"}
#     )
#     assert result["session"] == "mock_session"


@patch("app.services.auth_service.client", new_callable=MagicMock)
def test_callback_failure(mock_client, app):
    mock_client.auth.exchange_code_for_session.side_effect = Exception("bad code")

    response, status_code = auth_service.callback("bad_code")
    assert status_code == 401
    assert response.get_json()["message"].startswith("Authentication failed")


@patch("app.services.auth_service.client", new_callable=MagicMock)
def test_signout_success(mock_client, app):
    result, status_code = auth_service.signout("user123")

    mock_client.auth.sign_out.assert_called_once()
    assert status_code == 200
    assert result.get_json()["message"] == "Signout successful"


@patch("app.services.auth_service.client", new_callable=MagicMock)
def test_signout_failure(mock_client, app):
    mock_client.auth.sign_out.side_effect = Exception("logout failed")
    result, status_code = auth_service.signout("user123")

    assert status_code == 401
    assert result.get_json()["message"].startswith("Signout failed")


@patch("app.services.auth_service.client", new_callable=MagicMock)
def test_signup_with_email(mock_client, app):
    mock_user = MagicMock()
    mock_user.id = "new-user-id"
    mock_client.auth.sign_up.return_value.user = mock_user

    table_mock = MagicMock()
    mock_client.table.return_value = table_mock
    table_mock.insert.return_value.execute.return_value = None

    result, _ = auth_service.signup_with_email(
        email="new@example.com",
        password="password123",
        first_name="New",
        last_name="User",
    )

    mock_client.auth.sign_up.assert_called_once_with(
        {
            "email": "new@example.com",
            "password": "password123",
        }
    )
    table_mock.insert.assert_called_once_with(
        {
            "id": "new-user-id",
            "first_name": "New",
            "last_name": "User",
            "email": "new@example.com",
            "status": "ACTIVE",
        }
    )
    assert result.user.id == "new-user-id"
