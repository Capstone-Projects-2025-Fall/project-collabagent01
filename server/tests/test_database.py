import unittest
from unittest.mock import patch, MagicMock
import os
import requests

# Mock environment variables before importing db module
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

from src.database.db import sb_select, sb_insert, sb_update, sb_delete, _check_config, _handle


class DatabaseTestCase(unittest.TestCase):
    """Test cases for database.db module functions"""

    def setUp(self):
        """Set up test environment variables"""
        os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
        os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

    @patch('src.database.db.requests.get')
    def test_sb_select_success(self, mock_get):
        """Test sb_select with successful response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '[{"id": "1", "name": "test"}]'
        mock_response.json.return_value = [{"id": "1", "name": "test"}]
        mock_get.return_value = mock_response

        result = sb_select("test_table", {"select": "id,name", "limit": "10"})
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "test")
        mock_get.assert_called_once()

    @patch('src.database.db.requests.get')
    def test_sb_select_empty_result(self, mock_get):
        """Test sb_select with empty result"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '[]'
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        result = sb_select("test_table", {"select": "*"})
        
        self.assertEqual(result, [])

    @patch('src.database.db.requests.post')
    def test_sb_insert_success(self, mock_post):
        """Test sb_insert with successful insertion"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.text = '[{"id": "new-id", "title": "Test Note"}]'
        mock_response.json.return_value = [{"id": "new-id", "title": "Test Note"}]
        mock_post.return_value = mock_response

        result = sb_insert("notes", {"title": "Test Note", "body": "Test body"})
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["title"], "Test Note")
        mock_post.assert_called_once()

    @patch('src.database.db.requests.patch')
    def test_sb_update_success(self, mock_patch):
        """Test sb_update with successful update"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '[{"id": "1", "name": "Updated Name"}]'
        mock_response.json.return_value = [{"id": "1", "name": "Updated Name"}]
        mock_patch.return_value = mock_response

        result = sb_update("user_profiles", {"id": "eq.1"}, {"name": "Updated Name"})
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["name"], "Updated Name")
        mock_patch.assert_called_once()

    @patch('src.database.db.requests.delete')
    def test_sb_delete_success(self, mock_delete):
        """Test sb_delete with successful deletion"""
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_response.text = ''
        mock_delete.return_value = mock_response

        result = sb_delete("notes", {"id": "eq.1"})
        
        self.assertEqual(result, [])
        mock_delete.assert_called_once()

    @patch('src.database.db.requests.get')
    def test_sb_select_http_error(self, mock_get):
        """Test sb_select with HTTP error"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_response.raise_for_status.side_effect = requests.HTTPError()
        mock_get.return_value = mock_response

        with self.assertRaises(RuntimeError) as context:
            sb_select("test_table", {})
        
        self.assertIn("Supabase REST", str(context.exception))

    @patch('src.database.db.requests.get')
    def test_sb_select_timeout(self, mock_get):
        """Test sb_select handles timeout properly"""
        mock_get.side_effect = requests.Timeout("Connection timeout")
        
        with self.assertRaises(requests.Timeout):
            sb_select("test_table", {})

    @patch('src.database.db.requests.post')
    def test_sb_insert_with_empty_response(self, mock_post):
        """Test sb_insert with empty response text"""
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.text = ''
        mock_post.return_value = mock_response

        result = sb_insert("test_table", {"data": "test"})
        
        self.assertEqual(result, [])


if __name__ == '__main__':
    unittest.main()
