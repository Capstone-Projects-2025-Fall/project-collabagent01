import unittest
from unittest.mock import patch, MagicMock
import os

# Set up test environment variables
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

from src.app import app


class UserRouteTestCase(unittest.TestCase):
    """Test cases for user_route.py endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    @patch('src.routes.user_route.requests.get')
    def test_get_user_success(self, mock_requests_get):
        """Test GET /users/<user_id> with valid token"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "test-user-id",
            "email": "test@example.com",
            "role": "user",
            "user_metadata": {
                "first_name": "John",
                "last_name": "Doe",
                "full_name": "John Doe"
            }
        }
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/test-access-token')
        
        self.assertEqual(response.status_code, 200)
        data = response.json['data']
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['first_name'], 'John')
        self.assertEqual(data['last_name'], 'Doe')
        self.assertEqual(data['status'], 'ACTIVE')
        self.assertFalse(data['is_locked'])

    @patch('src.routes.user_route.requests.get')
    def test_get_user_invalid_token(self, mock_requests_get):
        """Test GET /users/<user_id> with invalid token"""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = 'Unauthorized'
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/invalid-token')
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'Invalid or expired token')

    @patch('src.routes.user_route.requests.get')
    def test_get_user_with_full_name_only(self, mock_requests_get):
        """Test GET /users/<user_id> when only full_name is provided"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "test-user-id",
            "email": "test@example.com",
            "role": "admin",
            "user_metadata": {
                "full_name": "Jane Smith"
            }
        }
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/test-access-token')
        
        self.assertEqual(response.status_code, 200)
        data = response.json['data']
        self.assertEqual(data['first_name'], 'Jane')
        self.assertEqual(data['last_name'], 'Smith')

    @patch('src.routes.user_route.requests.get')
    def test_get_user_with_no_metadata(self, mock_requests_get):
        """Test GET /users/<user_id> when user_metadata is empty"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "test-user-id",
            "email": "test@example.com",
            "role": "user",
            "user_metadata": {}
        }
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/test-access-token')
        
        self.assertEqual(response.status_code, 200)
        data = response.json['data']
        self.assertEqual(data['first_name'], 'User')
        self.assertEqual(data['last_name'], '')

    @patch('src.routes.user_route.requests.get')
    def test_get_user_default_settings(self, mock_requests_get):
        """Test GET /users/<user_id> returns correct default settings"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "test-user-id",
            "email": "test@example.com",
            "user_metadata": {}
        }
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/test-access-token')
        
        self.assertEqual(response.status_code, 200)
        settings = response.json['data']['settings']
        self.assertEqual(settings['bug_percentage'], 0.1)
        self.assertTrue(settings['show_notifications'])
        self.assertTrue(settings['give_suggestions'])
        self.assertFalse(settings['enable_quiz'])
        self.assertEqual(settings['active_threshold'], 80)
        self.assertEqual(settings['suspend_threshold'], 50)
        self.assertEqual(settings['pass_rate'], 0.7)
        self.assertEqual(settings['suspend_rate'], 0.3)
        self.assertFalse(settings['intervened'])

    @patch('src.routes.user_route.requests.get')
    def test_get_user_missing_config(self, mock_requests_get):
        """Test GET /users/<user_id> when backend config is missing"""
        # Mock request to return 401 or error due to missing config
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = 'Config error'
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/test-token')
        
        # The endpoint returns 401 when auth fails (which it will with bad config)
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)

    @patch('src.routes.user_route.requests.get')
    def test_get_user_timeout(self, mock_requests_get):
        """Test GET /users/<user_id> handles timeout"""
        mock_requests_get.side_effect = Exception("Connection timeout")

        response = self.app.get('/users/test-token')
        
        self.assertEqual(response.status_code, 500)
        self.assertIn('error', response.json)

    @patch('src.routes.user_route.requests.get')
    def test_get_user_with_single_word_name(self, mock_requests_get):
        """Test GET /users/<user_id> when full_name is a single word"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "test-user-id",
            "email": "test@example.com",
            "user_metadata": {
                "full_name": "Prince"
            }
        }
        mock_requests_get.return_value = mock_response

        response = self.app.get('/users/test-access-token')
        
        self.assertEqual(response.status_code, 200)
        data = response.json['data']
        self.assertEqual(data['first_name'], 'Prince')
        self.assertEqual(data['last_name'], 'Prince')


if __name__ == '__main__':
    unittest.main()
