import unittest
from unittest.mock import patch
import os

# Set up test environment variables
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

from src.app import app


class JiraRouteTestCase(unittest.TestCase):
    """Test cases for jira_route.py endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    def test_save_jira_config_missing_team_id(self):
        """Test POST /api/jira/config with missing team_id"""
        response = self.app.post('/api/jira/config', json={
            "jira_url": "https://test.atlassian.net",
            "jira_project_key": "TEST",
            "access_token": "test-token",
            "admin_user_id": "user-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)
        self.assertIn('team_id', response.json['error'])

    def test_save_jira_config_missing_jira_url(self):
        """Test POST /api/jira/config with missing jira_url"""
        response = self.app.post('/api/jira/config', json={
            "team_id": "team-id",
            "jira_project_key": "TEST",
            "access_token": "test-token",
            "admin_user_id": "user-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    def test_save_jira_config_invalid_url_format(self):
        """Test POST /api/jira/config with invalid URL format"""
        response = self.app.post('/api/jira/config', json={
            "team_id": "team-id",
            "jira_url": "invalid-url",
            "jira_project_key": "TEST",
            "access_token": "test-token",
            "admin_user_id": "user-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid Jira URL format', response.json['error'])

    @patch('src.routes.jira_route.sb_select')
    @patch('src.routes.jira_route.sb_insert')
    def test_save_jira_config_create_new(self, mock_sb_insert, mock_sb_select):
        """Test POST /api/jira/config creates new config"""
        mock_sb_select.return_value = []  # No existing config
        mock_sb_insert.return_value = [{
            "id": "config-id",
            "team_id": "team-id",
            "jira_url": "https://test.atlassian.net",
            "jira_project_key": "TEST",
            "access_token": "test-token",
            "admin_user_id": "user-id"
        }]

        response = self.app.post('/api/jira/config', json={
            "team_id": "team-id",
            "jira_url": "https://test.atlassian.net/",
            "jira_project_key": "TEST",
            "access_token": "test-token",
            "admin_user_id": "user-id"
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.json)
        self.assertEqual(response.json['message'], 'Jira configuration saved successfully')

    @patch('src.routes.jira_route.sb_select')
    @patch('src.routes.jira_route.sb_update')
    def test_save_jira_config_update_existing(self, mock_sb_update, mock_sb_select):
        """Test POST /api/jira/config updates existing config"""
        mock_sb_select.return_value = [{"id": "existing-config-id"}]
        mock_sb_update.return_value = [{
            "id": "existing-config-id",
            "team_id": "team-id",
            "jira_url": "https://updated.atlassian.net",
            "jira_project_key": "UPDATED",
            "access_token": "updated-token",
            "admin_user_id": "user-id"
        }]

        response = self.app.post('/api/jira/config', json={
            "team_id": "team-id",
            "jira_url": "https://updated.atlassian.net",
            "jira_project_key": "UPDATED",
            "access_token": "updated-token",
            "admin_user_id": "user-id"
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.json)

    @patch('src.routes.jira_route.sb_select')
    def test_save_jira_config_strips_trailing_slash(self, mock_sb_select):
        """Test POST /api/jira/config strips trailing slash from URL"""
        mock_sb_select.return_value = []
        
        with patch('src.routes.jira_route.sb_insert') as mock_sb_insert:
            mock_sb_insert.return_value = [{"id": "config-id"}]
            
            self.app.post('/api/jira/config', json={
                "team_id": "team-id",
                "jira_url": "https://test.atlassian.net///",
                "jira_project_key": "TEST",
                "access_token": "test-token",
                "admin_user_id": "user-id"
            })
            
            # Verify the URL was stripped
            call_args = mock_sb_insert.call_args[0][1]
            self.assertEqual(call_args['jira_url'], 'https://test.atlassian.net')

    def test_get_jira_config_missing_team_id(self):
        """Test GET /api/jira/config/<team_id> without team_id"""
        response = self.app.get('/api/jira/config/')
        
        self.assertEqual(response.status_code, 404)

    @patch('src.routes.jira_route.sb_select')
    def test_get_jira_config_success(self, mock_sb_select):
        """Test GET /api/jira/config/<team_id> returns config"""
        mock_sb_select.return_value = [{
            "id": "config-id",
            "team_id": "team-id",
            "jira_url": "https://test.atlassian.net",
            "jira_project_key": "TEST",
            "access_token": "test-token",
            "admin_user_id": "user-id",
            "created_at": "2024-01-01"
        }]

        response = self.app.get('/api/jira/config/team-id')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['team_id'], 'team-id')
        self.assertEqual(response.json['jira_url'], 'https://test.atlassian.net')

    @patch('src.routes.jira_route.sb_select')
    def test_get_jira_config_not_found(self, mock_sb_select):
        """Test GET /api/jira/config/<team_id> when config doesn't exist"""
        mock_sb_select.return_value = []

        response = self.app.get('/api/jira/config/nonexistent-team')
        
        self.assertEqual(response.status_code, 404)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'Jira configuration not found')

    @patch('src.routes.jira_route.sb_select')
    @patch('src.routes.jira_route.sb_delete')
    def test_delete_jira_config_success(self, mock_sb_delete, mock_sb_select):
        """Test DELETE /api/jira/config/<team_id> deletes config"""
        mock_sb_select.return_value = [{"id": "config-id"}]
        mock_sb_delete.return_value = []

        response = self.app.delete('/api/jira/config/team-id')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.json)
        self.assertEqual(response.json['message'], 'Jira configuration deleted successfully')

    @patch('src.routes.jira_route.sb_select')
    def test_delete_jira_config_not_found(self, mock_sb_select):
        """Test DELETE /api/jira/config/<team_id> when config doesn't exist"""
        mock_sb_select.return_value = []

        response = self.app.delete('/api/jira/config/nonexistent-team')
        
        self.assertEqual(response.status_code, 404)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'Jira configuration not found')

    def test_delete_jira_config_missing_team_id(self):
        """Test DELETE /api/jira/config/ without team_id"""
        response = self.app.delete('/api/jira/config/')
        
        self.assertEqual(response.status_code, 404)

    def test_save_jira_config_missing_multiple_fields(self):
        """Test POST /api/jira/config with multiple missing fields"""
        response = self.app.post('/api/jira/config', json={
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)


if __name__ == '__main__':
    unittest.main()
