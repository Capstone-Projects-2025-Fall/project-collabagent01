import pytest
from unittest.mock import patch, MagicMock
from app.models.response import success_response, error_response
from app.models.status_codes import StatusCodes


def test_login_page(client):
    response = client.get("/login")
    assert response.status_code == 200


def test_login_route_email_success(client):
    mock_login = MagicMock()
    mock_login.user.id = "123"
    mock_login.session.access_token = "123456"
    mock_login.session.refresh_token = "abcdef"

    with patch("app.routes.auth.login_with_email", return_value=mock_login):
        response = client.post(
            "/auth/login?provider=email",
            json={"email": "test@test.com", "password": "testpassword"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["token"] == "123"
        assert data["data"]["access_token"] == "123456"
        assert data["data"]["refresh_token"] == "abcdef"


def test_login_route_email_missing_fields(client):
    mock_login = MagicMock()
    mock_login.user.id = "123"
    mock_login.session.access_token = "123456"
    mock_login.session.refresh_token = "abcdef"

    with patch("app.routes.auth.login_with_email", return_value=mock_login):
        response = client.post(
            "/auth/login?provider=email",
            json={
                "email": "test@test.com",
            },
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["message"] == "Email or password not provided"
        assert data["data"] is None


def test_login_route_github_success(client):
    mock_login = MagicMock()
    mock_login.url = "http://example.com"

    with patch("app.routes.auth.login_with_provider", return_value=mock_login):
        response = client.get("/auth/login?provider=github")
        assert response.status_code == 302
        assert response.headers["Location"] == "http://example.com"


def test_login_route_github_missing_provider(client):
    response = client.get("/auth/login")
    assert response.status_code == 400
    data = response.get_json()
    assert data["message"] == "Provider not provided. Ex github"
    assert data["data"] is None


def test_auth_complete(client):
    response = client.get("/auth/complete")
    assert response.status_code == 200
    assert b"<p>Signed in successfully!</p>" in response.data


def test_auth_callback(client):
    mock_auth = MagicMock()
    mock_auth.user.id = "123"
    mock_auth.session.access_token = "123456"
    mock_auth.session.refresh_token = "abcdef"

    with patch("app.routes.auth.callback", return_value=mock_auth):
        response = client.get("/auth/callback?code=123456")
        assert response.status_code == 302
        assert (
            response.headers["Location"]
            == f"/auth/complete?id={mock_auth.user.id}&access_token={mock_auth.session.access_token}&refresh_token={mock_auth.session.refresh_token}"
        )


def test_auth_callback_missing_code(client):
    response = client.get("/auth/callback")
    assert response.status_code == 400
    data = response.get_json()
    assert data["message"] == "Error: Missing authorization code"
    assert data["data"] is None


def test_auth_callback_next_url(client):
    mock_auth = MagicMock()
    mock_auth.user.id = "123"
    mock_auth.session.access_token = "123456"
    mock_auth.session.refresh_token = "abcdef"

    with client.session_transaction() as sess:
        sess["next_url"] = "/clover"

    with patch("app.routes.auth.callback", return_value=mock_auth):
        response = client.get("/auth/callback?code=123456")

        assert response.status_code == 302
        assert response.headers["Location"] == (
            f"/clover?id=123&access_token=123456&refresh_token=abcdef"
        )


def test_auth_signup_success(client):
    mock_signup = MagicMock()
    mock_signup.user.id = "123"

    with patch("app.routes.auth.signup_with_email", return_value=(mock_signup, 201)):
        response = client.post(
            "/auth/signup",
            json={
                "email": "test@test.com",
                "password": "testpassword",
                "first_name": "John",
                "last_name": "Doe",
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["message"] == "Signup successful"
        assert data["data"]["token"] == "123"


def test_auth_signup_missing_fields(client):
    response = client.post(
        "/auth/signup", json={"email": "", "password": "testpassword"}
    )

    assert response.status_code == 400
    data = response.get_json()
    assert data["message"] == "Email or password not provided"
    assert data["data"] is None


def test_auth_signout_success(client, app):
    with app.app_context():
        with patch(
            "app.routes.auth.signout",
            return_value=success_response("Signout successful", None, StatusCodes.OK),
        ):
            response = client.post("/auth/signout", json={"user_id": "123"})

            assert response.status_code == 200
            data = response.get_json()
            assert data["message"] == "Signout successful"
            assert data["data"] is None


def test_auth_signout_missing_user_id(client):
    response = client.post("/auth/signout", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["message"] == "User ID not provided"
    assert data["data"] is None
