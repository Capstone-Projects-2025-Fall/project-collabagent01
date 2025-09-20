import pytest
from unittest.mock import patch

from app.models.suggestion import Suggestion


@pytest.fixture
def mock_get_suggestion():
    with patch("app.routes.suggestions.getSuggestion") as mock:
        yield mock


@pytest.fixture
def mock_check_code_correctness():
    with patch("app.routes.suggestions.check_code_correctness") as mock:
        yield mock


@pytest.fixture
def mock_get_code_hint():
    with patch("app.routes.suggestions.generate_hint_from_gemini") as mock:
        yield mock


@pytest.fixture
def mock_get_refined_prompt():
    with patch("app.routes.suggestions.generate_refined_prompt") as mock:
        yield mock


# @pytest.fixture
# def mock_get_suggestion_by_id():
#     with patch("app.routes.suggestions.get_suggestion_by_id") as mock:
#         yield mock



def test_suggestions_route_prompt(client, mock_get_suggestion):
    mock_get_suggestion.return_value = ["Prompt response"]

    response = client.post("/suggestion", json={"prompt": "Test prompt"})

    assert response.status_code == 200
    assert response.json["data"]["response"] == ["Prompt response"]
    mock_get_suggestion.assert_called_once_with(prompt="Test prompt", vendor=None, model_name=None)


def test_suggestions_route_no_prompt(client):
    response = client.post("/suggestion", json={})

    assert response.status_code == 400
    assert response.json.get("message") == "No prompt provided"


def test_suggestions_route_refine(client, mock_get_refined_prompt):
    mock_get_refined_prompt.return_value = '{"Language": "python", "Context": "Some context."}'

    response = client.post("/suggestion/refine", json={"rawPrompt": "Raw Prompt"})

    assert response.status_code == 200
    assert "refinedPrompt" in response.json["data"]
    assert isinstance(response.json["data"]["refinedPrompt"], str)
    mock_get_refined_prompt.assert_called_once_with("Raw Prompt")


def test_suggestions_route_hint(client, mock_get_code_hint):
    mock_get_code_hint.return_value = "Hint response"

    response = client.post("/suggestion/hint", json={
        "prompt": "Hint prompt",
        "wrongCode": "wrongCode",
        "rightCode": "rightCode"
    })

    assert response.status_code == 200
    assert response.json["data"] == {"hint": "Hint response"}


def test_suggestions_route_answer(client, mock_check_code_correctness):
    mock_check_code_correctness.return_value = True

    response = client.post("/suggestion/answer", json={
        "prompt": "Answer prompt",
        "wrongCode": "wrongCode",
        "fixedCode": "fixedCode"
    })

    assert response.status_code == 200
    assert response.json["data"] == {"isCorrect": True}
    mock_check_code_correctness.assert_called_once_with("Answer prompt", "wrongCode", "fixedCode")

# def test_get_suggestion_details(client, mock_get_suggestion_by_id):
#     prompt = """{
#     "Language": "python",
#     "Context": "Complete the function to add two numbers and return the sum.",
#     "Completion": "    return a + b"
#     }"""
#     suggestion = Suggestion(id=3,
#         created_at="2025-04-22 05:24:53.979112+00",
#         prompt=prompt,
#         suggestion_text="Suggestion text",
#         has_bug=False,
#         model="gemini-2.0-flash-lite"
#     )

#     mock_get_suggestion_by_id.return_value = suggestion
#     response = client.get("/suggestion/3")

#     assert response.status_code == 200
#     assert response.json["data"] == suggestion.to_json()