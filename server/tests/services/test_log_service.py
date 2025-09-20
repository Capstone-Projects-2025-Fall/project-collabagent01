import pytest
from unittest.mock import patch, MagicMock
from app.services import log_service


def mock_execute_with_data(data):
    mock_response = MagicMock()
    mock_response.data = data
    return mock_response


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_log_event_success(mock_client, app):
    mock_table = MagicMock()
    mock_insert = MagicMock()
    mock_execute = MagicMock()

    mock_client.table.return_value = mock_table
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = None

    event = {"event": "test", "metadata": {"user_id": "abc"}}

    log_service.log_event(event)

    mock_client.table.assert_called_once_with("logs")
    mock_table.insert.assert_called_once_with(event)
    mock_insert.execute.assert_called_once()


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_log_suggestion_success(mock_client, app):
    mock_table = MagicMock()
    mock_insert = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "abc123"}]

    mock_client.table.return_value = mock_table
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute

    suggestion = {
        "event": "suggestion",
        "metadata": {},
    }

    result = log_service.log_suggestion(suggestion)

    assert result["id"] == "abc123"
    mock_client.table.assert_called_with("suggestions")
    mock_table.insert.assert_called_once_with(suggestion)


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_log_suggestion_failure_no_data(mock_client, app):
    mock_table = MagicMock()
    mock_insert = MagicMock()
    mock_execute = MagicMock()
    mock_execute.data = None

    mock_client.table.return_value = mock_table
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.return_value = mock_execute

    with pytest.raises(Exception, match="No data returned from insert operation"):
        log_service.log_suggestion({"event": "fail", "metadata": {}})


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_get_all_logs(mock_client, app):
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_execute = mock_execute_with_data([{"event": "test"}])

    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.execute.return_value = mock_execute

    result = log_service.get_all_logs()
    assert result == [{"event": "test"}]


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_get_logs_by_user(mock_client, app):
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_execute = mock_execute_with_data([{"event": "test"}])

    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = mock_execute

    result = log_service.get_logs_by_user("user123")
    assert result == [{"event": "test"}]


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_get_logs_by_user_with_section_and_class(mock_client, app):
    # Set up chained .eq().eq().eq().execute().data
    mock_execute = MagicMock()
    mock_execute.data = [{"event": "test"}]

    mock_eq3 = MagicMock()
    mock_eq3.execute.return_value = mock_execute

    mock_eq2 = MagicMock()
    mock_eq2.eq.return_value = mock_eq3

    mock_eq1 = MagicMock()
    mock_eq1.eq.return_value = mock_eq2

    mock_select = MagicMock()
    mock_select.eq.return_value = mock_eq1

    mock_table = MagicMock()
    mock_table.select.return_value = mock_select

    mock_client.table.return_value = mock_table

    result = log_service.get_logs_by_user("user123", "sec1", "class1")
    assert result == [{"event": "test"}]


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_get_logs_by_class(mock_client, app):
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_execute = mock_execute_with_data([{"event": "class-log"}])

    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = mock_execute

    result = log_service.get_logs_by_class("class123")
    assert result == [{"event": "class-log"}]


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_get_ai_usage(mock_client, app):
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_execute = mock_execute_with_data([{"usage": 10}])

    mock_client.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.execute.return_value = mock_execute

    result = log_service.get_ai_usage()
    assert result == [{"usage": 10}]


@patch("app.services.log_service.client", new_callable=MagicMock)
def test_get_all_data_from_db(mock_client, app):
    mock_client.table.return_value.select.return_value.execute.side_effect = [
        mock_execute_with_data([{"id": "user1"}]),       
        mock_execute_with_data([{"id": "cu1"}]),         
        mock_execute_with_data([{"id": "class1"}]),      
        mock_execute_with_data([{"event": "log1"}]),     
        mock_execute_with_data([{"id": "suggest1"}]),    
        mock_execute_with_data([{"id": "usq1"}]),        
        mock_execute_with_data([{"id": "us1"}]),         
    ]

    result = log_service.get_all_data_from_db()

    assert result["users"][0]["id"] == "user1"
    assert result["logs"][0]["event"] == "log1"
    assert "user_sections" in result
