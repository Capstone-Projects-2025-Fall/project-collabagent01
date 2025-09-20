import pytest
import requests
import json
from unittest.mock import MagicMock, patch, ANY

from app.services import suggestion_service
from app.controllers.ai import (
    vendors,
    default_openai_parameters,
    OLLAMA_URL,
    good_command,
    bad_command,
)
from app.models.errors import ModelError, DatabaseError
from app.models.user import Suggestion
from flask import Flask
import logging


@pytest.fixture
def mock_openai_client(mocker):
    """Mocks the OpenAI client."""
    mock_client = MagicMock()
    mock_chat = MagicMock()
    mock_completions = MagicMock()
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()

    mock_message.content = "openai_suggestion"
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]
    mock_completions.create.return_value = mock_response
    mock_chat.completions = mock_completions
    mock_client.chat = mock_chat

    mock_models = MagicMock()
    mock_model_list_response = MagicMock()
    mock_model_list_response.data = [
        MagicMock(id="gpt-4o-mini"),
        MagicMock(id="gpt-3.5-turbo"),
    ]
    mock_models.list.return_value = mock_model_list_response
    mock_client.models = mock_models

    mocker.patch("app.services.suggestion_service.openai_client", mock_client)
    return mock_client


@pytest.fixture
def mock_gemini_client(mocker):
    """Mocks the Gemini client."""
    mock_client = MagicMock()
    mock_session = MagicMock()
    mock_response = MagicMock()

    mock_response.text = json.dumps(["+ b;", " - b;"])
    mock_usage = MagicMock()
    mock_usage.prompt_token_count = 10
    mock_usage.candidates_token_count = 5
    mock_usage.total_token_count = 15
    mock_response.usage_metadata = mock_usage

    mock_session.send_message.return_value = mock_response
    mock_client.chat_session = mock_session

    mock_models = MagicMock()
    model1 = MagicMock(
        name="models/gemini-1.5-flash", supported_actions=["generateContent"]
    )
    model2 = MagicMock(name="models/gemini-pro", supported_actions=["embedContent"])
    model3 = MagicMock(
        name="models/gemini-2.0-flash", supported_actions=["generateContent", "other"]
    )
    mock_models.list.return_value = [model1, model2, model3]
    mock_client.models = mock_models

    mocker.patch("app.services.suggestion_service.gemini_client", mock_client)
    return mock_client


@pytest.fixture
def mock_db_client(mocker):
    """Mocks the Supabase database client."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_single = MagicMock()
    mock_insert = MagicMock()
    mock_execute = MagicMock()
    mock_execute_select = MagicMock()

    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.single.return_value = mock_single
    mock_single.execute.return_value = mock_execute_select

    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute

    mocker.patch("app.services.suggestion_service.client", mock_client)
    return mock_client, mock_execute_select


@pytest.fixture
def mock_requests(mocker):
    """Mocks the requests library."""
    mock_post = mocker.patch("requests.post")
    mock_get = mocker.patch("requests.get")

    mock_post_response = MagicMock()
    mock_post_response.json.return_value = {"response": "ollama_suggestion"}
    mock_post_response.raise_for_status.return_value = None
    mock_post.return_value = mock_post_response

    mock_get_response = MagicMock()
    mock_get_response.json.return_value = {
        "models": [{"name": "codellama:latest"}, {"name": "mistral:latest"}]
    }
    mock_get_response.raise_for_status.return_value = None
    mock_get.return_value = mock_get_response

    return mock_post, mock_get, mock_post_response, mock_get_response


def test_getSuggestion_routes_to_openai(mocker):
    mock_openai = mocker.patch.object(
        suggestion_service, "getSuggestionFromOpenAI", return_value="test"
    )
    suggestion_service.getSuggestion(
        "prompt", vendor=vendors.OpenAI, model_name="gpt-test"
    )
    mock_openai.assert_called_once_with(prompt="prompt", model="gpt-test")


def test_getSuggestion_routes_to_ollama(mocker):
    mock_ollama = mocker.patch.object(
        suggestion_service, "getSuggestionFromOllama", return_value="test"
    )
    suggestion_service.getSuggestion(
        "prompt", vendor=vendors.Ollama, model_name="codellama"
    )
    mock_ollama.assert_called_once_with(prompt="prompt", model_name="codellama")


def test_getSuggestion_routes_to_google(mocker):
    mock_google = mocker.patch.object(
        suggestion_service, "getSuggestionFromGoogle", return_value=["test"]
    )
    suggestion_service.getSuggestion("prompt", vendor=vendors.Google)
    mock_google.assert_called_once_with(prompt="prompt")


def test_getSuggestion_defaults_to_google_on_invalid_vendor(mocker):
    mock_google = mocker.patch.object(
        suggestion_service, "getSuggestionFromGoogle", return_value=["test"]
    )
    suggestion_service.getSuggestion("prompt", vendor="InvalidVendor")
    mock_google.assert_called_once_with(prompt="prompt")


def test_getSuggestionFromOpenAI_success_correct(mock_openai_client, app):
    prompt = "def func("
    suggestion = suggestion_service.getSuggestionFromOpenAI(
        prompt, model="gpt-4o-mini", is_correct=True
    )

    assert suggestion == "openai_suggestion"
    call_args = mock_openai_client.chat.completions.create.call_args
    assert call_args.kwargs["model"] == "gpt-4o-mini"
    assert call_args.kwargs["messages"][0]["role"] == "system"
    assert "slightly incorrect" not in call_args.kwargs["messages"][0]["content"]
    assert call_args.kwargs["messages"][1]["role"] == "user"
    assert call_args.kwargs["messages"][1]["content"] == prompt


def test_getSuggestionFromOpenAI_success_incorrect(mock_openai_client, app):
    prompt = "def func("
    mock_choice = mock_openai_client.chat.completions.create.return_value.choices[0]
    mock_choice.message.content = "openai_incorrect_suggestion"

    suggestion = suggestion_service.getSuggestionFromOpenAI(
        prompt, model="gpt-4o-mini", is_correct=False
    )

    assert suggestion == "openai_incorrect_suggestion"
    call_args = mock_openai_client.chat.completions.create.call_args
    assert "slightly incorrect" in call_args.kwargs["messages"][0]["content"]


def test_getSuggestionFromOpenAI_api_error(mock_openai_client, app):
    mock_openai_client.chat.completions.create.side_effect = Exception("API Down")

    with pytest.raises(
        ModelError, match="Error generating suggestion using OpenAI's API"
    ):
        suggestion_service.getSuggestionFromOpenAI("prompt")


def test_getSuggestionFromOllama_success_correct(mock_requests):
    mock_post, _, _, _ = mock_requests
    prompt = "import os"
    model_name = "codellama"
    suggestion = suggestion_service.getSuggestionFromOllama(
        prompt, model_name=model_name, is_correct=True
    )

    assert suggestion == "ollama_suggestion"
    expected_payload = {
        "model": model_name,
        "prompt": good_command + prompt,
        "keep_alive": "1h",
        "stream": False,
    }
    mock_post.assert_called_once_with(OLLAMA_URL, json=expected_payload)


def test_getSuggestionFromOllama_success_incorrect(mock_requests):
    mock_post, _, _, _ = mock_requests
    prompt = "import os"
    model_name = "codellama"
    suggestion = suggestion_service.getSuggestionFromOllama(
        prompt, model_name=model_name, is_correct=False
    )

    assert suggestion == "ollama_suggestion"
    expected_payload = {
        "model": model_name,
        "prompt": bad_command + prompt,
        "keep_alive": "1h",
        "stream": False,
    }
    mock_post.assert_called_once_with(OLLAMA_URL, json=expected_payload)


def test_getSuggestionFromOllama_request_error(mock_requests):
    mock_post, _, mock_post_response, _ = mock_requests
    mock_post_response.raise_for_status.side_effect = (
        requests.exceptions.RequestException("Connection Failed")
    )

    with pytest.raises(
        ModelError, match="Error fetching Ollama suggestion: Connection Failed"
    ):
        suggestion_service.getSuggestionFromOllama("prompt", "model")


def test_getSuggestionFromOllama_other_error(mock_requests):
    mock_post, _, _, _ = mock_requests
    mock_post.side_effect = Exception("Unexpected error")

    with pytest.raises(
        ModelError, match="Error fetching Ollama suggestion: Unexpected error"
    ):
        suggestion_service.getSuggestionFromOllama("prompt", "model")


def test_getSuggestionFromGoogle_success(mock_gemini_client, mock_db_client, mocker):
    mocker.patch("time.time", side_effect=[100.0, 100.5])

    mock_client, _ = mock_db_client
    prompt = "function add(a, b) {\n  return a"
    result = suggestion_service.getSuggestionFromGoogle(prompt)

    assert result == ["+ b;", " - b;"]
    mock_gemini_client.chat_session.send_message.assert_called_once()
    assert prompt in mock_gemini_client.chat_session.send_message.call_args[0][0]

    mock_client.table.assert_called_once_with("ai_usage")
    mock_client.table().insert.assert_called_once_with(
        {
            "provider": "google",
            "model": "gemini-2.0-flash",
            "input_tokens": 10,
            "output_tokens": 5,
            "total_tokens": 15,
            "latency_seconds": 0.5,
        }
    )
    mock_client.table().insert().execute.assert_called_once()


def test_getSuggestionFromGoogle_gemini_error(
    mock_gemini_client, mock_db_client, caplog
):
    mock_gemini_client.chat_session.send_message.side_effect = Exception(
        "Gemini API error"
    )
    mock_client, _ = mock_db_client

    result = suggestion_service.getSuggestionFromGoogle("prompt")

    assert result == []
    assert (
        "Error communicating with Gemini (Type: Exception): Gemini API error"
        in caplog.text
    )
    mock_client.table.assert_not_called()


def test_getSuggestionFromGoogle_json_decode_error(
    mock_gemini_client, mock_db_client, caplog
):
    mock_gemini_client.chat_session.send_message.return_value.text = "This is not JSON"
    mock_client, _ = mock_db_client
    caplog.set_level(logging.ERROR)

    result = suggestion_service.getSuggestionFromGoogle("prompt")

    assert result == []

    assert "Final JSON parse failed" in caplog.text

    mock_client.table.assert_called_once_with("ai_usage")
    mock_client.table().insert().execute.assert_called_once()


def test_getSuggestionFromGoogle_empty_response(
    mock_gemini_client, mock_db_client, caplog
):
    mock_gemini_client.chat_session.send_message.return_value.text = ""
    mock_client, _ = mock_db_client

    result = suggestion_service.getSuggestionFromGoogle("prompt")

    assert result == []
    mock_client.table.assert_not_called()


def test_getSuggestionFromGoogle_no_usage_metadata(mock_gemini_client, mock_db_client):
    mock_gemini_client.chat_session.send_message.return_value.usage_metadata = None
    mock_client, _ = mock_db_client

    result = suggestion_service.getSuggestionFromGoogle("prompt")

    assert result == ["+ b;", " - b;"]
    mock_client.table.assert_called_once_with("ai_usage")
    mock_client.table().insert.assert_called_once_with(
        {
            "provider": "google",
            "model": "gemini-2.0-flash",
            "input_tokens": -1,
            "output_tokens": -1,
            "total_tokens": -1,
            "latency_seconds": ANY,
        }
    )
    mock_client.table().insert().execute.assert_called_once()


def test_getAvailableModels_routes_openai(mocker):
    mock_get = mocker.patch(
        "app.services.suggestion_service.getModelsFromOpenAI", return_value=[]
    )
    suggestion_service.getAvailableModels(vendors.OpenAI)
    mock_get.assert_called_once()


def test_getAvailableModels_routes_ollama(mocker):
    mock_get = mocker.patch(
        "app.services.suggestion_service.getModelsFromOllama", return_value=[]
    )
    suggestion_service.getAvailableModels(vendors.Ollama)
    mock_get.assert_called_once()


def test_getAvailableModels_routes_google(mocker):
    mock_get = mocker.patch(
        "app.services.suggestion_service.getModelsFromGoogle", return_value=[]
    )
    suggestion_service.getAvailableModels(vendors.Google)
    mock_get.assert_called_once()


def test_getAvailableModels_invalid_vendor(mocker):
    with pytest.raises(ValueError):
        suggestion_service.getAvailableModels("UnsupportedVendor")


def test_getModelsFromOpenAI_success(mock_openai_client, app):
    models = suggestion_service.getModelsFromOpenAI()
    assert models == ["gpt-4o-mini", "gpt-3.5-turbo"]
    mock_openai_client.models.list.assert_called_once()


def test_getModelsFromOpenAI_api_error(mock_openai_client, app):
    mock_openai_client.models.list.side_effect = Exception("API List Error")
    with pytest.raises(Exception, match="API List Error"):
        suggestion_service.getModelsFromOpenAI()


def test_getModelsFromOllama_success(mock_requests):
    _, mock_get, _, _ = mock_requests
    models = suggestion_service.getModelsFromOllama()
    expected_models = ["codellama:latest", "mistral:latest"]
    assert len(models) == len(expected_models)
    assert all(m["name"] in expected_models for m in models)
    mock_get.assert_called_once_with("http://localhost:11434/api/tags")


def test_getModelsFromOllama_request_error(mock_requests):
    _, mock_get, _, mock_get_response = mock_requests
    mock_get_response.raise_for_status.side_effect = (
        requests.exceptions.RequestException("Ollama Down")
    )
    with pytest.raises(
        Exception, match="Error fetching models from Ollama: Ollama Down"
    ):
        suggestion_service.getModelsFromOllama()


def test_getModelsFromOllama_missing_models_key(mock_requests):
    _, mock_get, _, mock_get_response = mock_requests
    mock_get_response.json.return_value = {"some_other_key": []}
    models = suggestion_service.getModelsFromOllama()
    assert models == []


def test_getModelsFromGoogle_success(mock_gemini_client):
    models = suggestion_service.getModelsFromGoogle()
    expected_models = ["models/gemini-1.5-flash", "models/gemini-2.0-flash"]
    mock_gemini_client.models.list.assert_called_once()


def test_getModelsFromGoogle_api_error(mock_gemini_client):
    mock_gemini_client.models.list.side_effect = Exception("Gemini List Error")
    with pytest.raises(Exception, match="Gemini List Error"):
        suggestion_service.getModelsFromGoogle()


def test_generate_refined_prompt_success(mock_gemini_client):
    mock_gemini_client.chat_session.send_message.return_value.text = (
        " Language: python\n Context: Complete the function. "
    )
    raw_prompt = "def my_func(x):\n  return"
    refined = suggestion_service.generate_refined_prompt(raw_prompt)

    assert refined == "Language: python\n Context: Complete the function."
    mock_gemini_client.chat_session.send_message.assert_called_once()

    assert raw_prompt in mock_gemini_client.chat_session.send_message.call_args[0][0]


def test_generate_refined_prompt_api_error(mock_gemini_client):
    mock_gemini_client.chat_session.send_message.side_effect = Exception("Refine Error")
    with pytest.raises(ValueError, match="AI prompt refinement failed: Refine Error"):
        suggestion_service.generate_refined_prompt("raw")


def test_generate_hint_from_gemini_success(mock_gemini_client):
    mock_gemini_client.chat_session.send_message.return_value.text = (
        " Check the operator used. "
    )
    hint = suggestion_service.generate_hint_from_gemini("prompt", "wrong", "right")

    assert hint == "Check the operator used."

    mock_gemini_client.chat_session.send_message.assert_called_once()
    args, _ = mock_gemini_client.chat_session.send_message.call_args
    sent_prompt = args[0]
    assert "Context: prompt" in sent_prompt
    assert "Incorrect Version:" in sent_prompt
    assert "wrong" in sent_prompt
    assert "Correct Version:" in sent_prompt
    assert "right" in sent_prompt


def test_generate_hint_from_gemini_api_error(mock_gemini_client):
    mock_gemini_client.chat_session.send_message.side_effect = Exception("Hint Error")
    hint = suggestion_service.generate_hint_from_gemini("prompt", "wrong", "right")
    assert hint == "Could not generate hint: Hint Error"


def test_generate_explanation_from_gemini_success(mock_gemini_client):
    mock_gemini_client.chat_session.send_message.return_value.text = (
        " The first version used addition incorrectly. "
    )
    explanation = suggestion_service.generate_explanation_from_gemini(
        "prompt", "wrong", "right"
    )

    assert explanation == "The first version used addition incorrectly."

    mock_gemini_client.chat_session.send_message.assert_called_once()
    args, _ = mock_gemini_client.chat_session.send_message.call_args
    sent_prompt = args[0]
    assert "Context: prompt" in sent_prompt
    assert "Incorrect Version:" in sent_prompt
    assert "wrong" in sent_prompt
    assert "Correct Version:" in sent_prompt
    assert "right" in sent_prompt
    assert "Generate an explanation" in sent_prompt


# Example for one of the check_code_correctness tests
@pytest.mark.parametrize(
    "api_response, expected_result",
    [
        ("true", True),
        ("false", False),
        (" True ", True),
        ("FALSE", False),
        ("maybe", False),
        ("", False),
    ],
)
def test_check_code_correctness(mock_gemini_client, api_response, expected_result):
    mock_gemini_client.chat_session.send_message.return_value.text = api_response
    is_correct = suggestion_service.check_code_correctness("prompt", "wrong", "fixed")

    assert is_correct == expected_result
    mock_gemini_client.chat_session.send_message.assert_called_once()
    args, _ = mock_gemini_client.chat_session.send_message.call_args
    sent_prompt = args[0]

    assert "Context: prompt" in sent_prompt
    assert "Incorrect Version:" in sent_prompt
    assert "wrong" in sent_prompt
    assert "Fixed Version:" in sent_prompt
    assert "fixed" in sent_prompt
    assert "Respond with only 'true' or 'false'." in sent_prompt


def test_get_suggestion_by_id_found(mock_db_client):
    mock_client, mock_execute_select = mock_db_client
    suggestion_data = {
        "id": "123",
        "user_id": "abc",
        "prompt": "test prompt",
        "correct_suggestion": "correct",
        "incorrect_suggestion": "incorrect",
        "status": "pending",
    }
    mock_execute_select.data = suggestion_data

    suggestion = suggestion_service.get_suggestion_by_id("123")

    assert isinstance(suggestion, Suggestion)
    assert suggestion.id == "123"
    assert suggestion.prompt == "test prompt"
    mock_client.table.assert_called_once_with("suggestions")
    mock_client.table().select.assert_called_once_with("*")
    mock_client.table().select().eq.assert_called_once_with("id", "123")
    mock_client.table().select().eq().single.assert_called_once()
    mock_client.table().select().eq().single().execute.assert_called_once()


def test_get_suggestion_by_id_not_found(mock_db_client):
    mock_client, mock_execute_select = mock_db_client
    mock_execute_select.data = None

    suggestion = suggestion_service.get_suggestion_by_id("404")

    assert suggestion is None

    mock_client.table.assert_called_once_with("suggestions")
    mock_client.table().select().eq().single().execute.assert_called_once()


def test_get_suggestion_by_id_db_error(mock_db_client):
    mock_client, mock_execute_select = mock_db_client

    mock_single = mock_client.table().select().eq().single()
    mock_single.execute.side_effect = Exception("DB Connection Error")

    with pytest.raises(
        DatabaseError, match="Failed to retrieve suggestion: DB Connection Error"
    ):
        suggestion_service.get_suggestion_by_id("123")
