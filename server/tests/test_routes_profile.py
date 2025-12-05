import unittest
from unittest.mock import patch
import os

# Set up test environment variables
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

from src.app import app


class ProfileRouteTestCase(unittest.TestCase):
    """Test cases for profile_route.py endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    def test_get_profile_missing_auth_header(self):
        """Test GET /api/profile without Authorization header"""
        response = self.app.get('/api/profile/?user_id=test-user-id')
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'Missing or invalid Authorization header')

    def test_get_profile_invalid_auth_header(self):
        """Test GET /api/profile with invalid Authorization header"""
        response = self.app.get('/api/profile/?user_id=test-user-id',
                               headers={'Authorization': 'InvalidFormat token'})
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)

    def test_get_profile_missing_user_id(self):
        """Test GET /api/profile without user_id parameter"""
        response = self.app.get('/api/profile/',
                               headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'user_id is required')

    @patch('src.routes.profile_route.sb_select')
    def test_get_profile_success(self, mock_sb_select):
        """Test GET /api/profile with successful profile retrieval"""
        mock_sb_select.return_value = [{
            "id": "profile-id",
            "user_id": "test-user-id",
            "name": "Test User",
            "interests": ["Python", "AI"],
            "custom_skills": ["Flask", "Testing"],
            "updated_at": "2024-01-01"
        }]

        response = self.app.get('/api/profile/?user_id=test-user-id',
                               headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertIn('profile', data)
        self.assertEqual(data['profile']['name'], 'Test User')
        self.assertEqual(len(data['profile']['interests']), 2)

    @patch('src.routes.profile_route.sb_select')
    def test_get_profile_not_found(self, mock_sb_select):
        """Test GET /api/profile when profile doesn't exist"""
        mock_sb_select.return_value = []

        response = self.app.get('/api/profile/?user_id=test-user-id',
                               headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertIsNone(data['profile'])
        self.assertEqual(data['message'], 'No profile found')

    def test_save_profile_missing_auth_header(self):
        """Test POST /api/profile without Authorization header"""
        response = self.app.post('/api/profile/', json={
            "user_id": "test-user",
            "name": "Test"
        })
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)

    def test_save_profile_invalid_auth_header(self):
        """Test POST /api/profile with invalid Authorization header"""
        response = self.app.post('/api/profile/', 
                                json={"user_id": "test-user", "name": "Test"},
                                headers={'Authorization': 'Bearer'})
        
        self.assertEqual(response.status_code, 401)

    def test_save_profile_missing_user_id(self):
        """Test POST /api/profile without user_id"""
        response = self.app.post('/api/profile/',
                                json={"name": "Test"},
                                headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'user_id is required')

    @patch('src.routes.profile_route.sb_select')
    @patch('src.routes.profile_route.sb_insert')
    def test_save_profile_create_new(self, mock_sb_insert, mock_sb_select):
        """Test POST /api/profile creates new profile"""
        mock_sb_select.return_value = []  # No existing profile
        mock_sb_insert.return_value = [{
            "id": "new-profile-id",
            "user_id": "test-user",
            "name": "Test User",
            "interests": ["Python"],
            "custom_skills": ["Flask"]
        }]

        response = self.app.post('/api/profile/',
                                json={
                                    "user_id": "test-user",
                                    "name": "Test User",
                                    "interests": ["Python"],
                                    "custom_skills": ["Flask"]
                                },
                                headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 201)
        data = response.json
        self.assertIn('profile', data)
        self.assertEqual(data['message'], 'Profile created successfully')

    @patch('src.routes.profile_route.sb_select')
    @patch('src.routes.profile_route.sb_update')
    def test_save_profile_update_existing(self, mock_sb_update, mock_sb_select):
        """Test POST /api/profile updates existing profile"""
        mock_sb_select.return_value = [{"id": "existing-id"}]
        mock_sb_update.return_value = [{
            "id": "existing-id",
            "user_id": "test-user",
            "name": "Updated Name",
            "interests": ["Python", "AI"],
            "custom_skills": ["Flask", "Testing"]
        }]

        response = self.app.post('/api/profile/',
                                json={
                                    "user_id": "test-user",
                                    "name": "Updated Name",
                                    "interests": ["Python", "AI"],
                                    "custom_skills": ["Flask", "Testing"]
                                },
                                headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertIn('profile', data)
        self.assertEqual(data['message'], 'Profile updated successfully')

    @patch('src.routes.profile_route.sb_select')
    @patch('src.routes.profile_route.sb_insert')
    def test_save_profile_with_empty_arrays(self, mock_sb_insert, mock_sb_select):
        """Test POST /api/profile with empty interests and skills"""
        mock_sb_select.return_value = []
        mock_sb_insert.return_value = [{
            "user_id": "test-user",
            "name": "Test",
            "interests": [],
            "custom_skills": []
        }]

        response = self.app.post('/api/profile/',
                                json={
                                    "user_id": "test-user",
                                    "name": "Test",
                                    "interests": [],
                                    "custom_skills": []
                                },
                                headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 201)

    @patch('src.routes.profile_route.sb_select')
    @patch('src.routes.profile_route.sb_insert')
    def test_save_profile_default_empty_arrays(self, mock_sb_insert, mock_sb_select):
        """Test POST /api/profile defaults to empty arrays when not provided"""
        mock_sb_select.return_value = []
        mock_sb_insert.return_value = [{
            "user_id": "test-user",
            "name": "Test",
            "interests": [],
            "custom_skills": []
        }]

        response = self.app.post('/api/profile/',
                                json={
                                    "user_id": "test-user",
                                    "name": "Test"
                                },
                                headers={'Authorization': 'Bearer test-token'})
        
        self.assertEqual(response.status_code, 201)
        # Verify the call used empty arrays as defaults
        call_args = mock_sb_insert.call_args[0][1]
        self.assertEqual(call_args['interests'], [])
        self.assertEqual(call_args['custom_skills'], [])


if __name__ == '__main__':
    unittest.main()
