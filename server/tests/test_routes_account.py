import unittest
from unittest.mock import patch, MagicMock
import os

# Set up test environment variables
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

from src.app import app


class AccountRouteTestCase(unittest.TestCase):
    """Test cases for account_route.py endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    def test_delete_account_missing_auth_header(self):
        """Test DELETE /api/account/delete without Authorization header"""
        response = self.app.post('/api/account/delete')
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)
        self.assertIn('Authorization', response.json['error'])

    def test_delete_account_invalid_auth_header(self):
        """Test DELETE /api/account/delete with invalid Authorization header"""
        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'InvalidFormat'})
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)

    @patch('src.routes.account_route.requests.get')
    def test_delete_account_invalid_token(self, mock_requests_get):
        """Test DELETE /api/account/delete with invalid token"""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.text = 'Invalid token'
        mock_requests_get.return_value = mock_response

        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'Bearer invalid-token'})
        
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.json)

    @patch('src.routes.account_route.sb_select')
    @patch('src.routes.account_route.sb_delete')
    @patch('src.routes.account_route.requests.get')
    @patch('src.routes.account_route.requests.delete')
    def test_delete_account_no_teams(self, mock_req_delete, mock_req_get, 
                                     mock_sb_delete, mock_sb_select):
        """Test DELETE /api/account/delete when user has no team memberships"""
        # Mock authentication response
        mock_auth_response = MagicMock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {"id": "user-id"}
        mock_req_get.return_value = mock_auth_response

        # Mock user has no teams
        mock_sb_select.return_value = []

        # Mock successful auth deletion
        mock_delete_response = MagicMock()
        mock_delete_response.status_code = 200
        mock_req_delete.return_value = mock_delete_response

        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'Bearer valid-token'})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])

    @patch('src.routes.account_route.sb_select')
    @patch('src.routes.account_route.sb_delete')
    @patch('src.routes.account_route.requests.get')
    @patch('src.routes.account_route.requests.delete')
    @patch('src.routes.account_route.get_user_display_name')
    def test_delete_account_delete_empty_team(self, mock_get_name, mock_req_delete, 
                                               mock_req_get, mock_sb_delete, mock_sb_select):
        """Test DELETE /api/account/delete deletes team when user is only member"""
        # Mock authentication
        mock_auth_response = MagicMock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {"id": "user-id"}
        mock_req_get.return_value = mock_auth_response

        mock_get_name.return_value = "Test User"

        # Mock user is admin of one team with no other members
        def sb_select_side_effect(table, params):
            if table == "team_membership":
                if "team_id" in params:
                    # All members of team (only the user)
                    return [{"id": "membership-id", "user_id": "user-id", "role": "admin"}]
                else:
                    # User's memberships
                    return [{"id": "membership-id", "team_id": "team-id", "role": "admin"}]
            elif table == "user_profiles":
                return [{"user_id": "user-id", "name": "Test User"}]
            return []

        mock_sb_select.side_effect = sb_select_side_effect

        # Mock successful deletion
        mock_delete_response = MagicMock()
        mock_delete_response.status_code = 200
        mock_req_delete.return_value = mock_delete_response

        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'Bearer valid-token'})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])

    @patch('src.routes.account_route.sb_select')
    @patch('src.routes.account_route.sb_update')
    @patch('src.routes.account_route.sb_delete')
    @patch('src.routes.account_route.sb_insert')
    @patch('src.routes.account_route.requests.get')
    @patch('src.routes.account_route.requests.delete')
    @patch('src.routes.account_route.get_user_display_name')
    def test_delete_account_transfer_ownership(self, mock_get_name, mock_req_delete, 
                                                mock_req_get, mock_sb_insert, mock_sb_delete, 
                                                mock_sb_update, mock_sb_select):
        """Test DELETE /api/account/delete transfers ownership when team has other members"""
        # Mock authentication
        mock_auth_response = MagicMock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {"id": "user-id"}
        mock_req_get.return_value = mock_auth_response

        mock_get_name.return_value = "Test User"

        # Mock user is admin with other team members
        def sb_select_side_effect(table, params):
            if table == "team_membership":
                if "team_id" in params:
                    # All members of team (admin and another member)
                    return [
                        {"id": "membership-id-1", "user_id": "user-id", "role": "admin", "joined_at": "2024-01-01"},
                        {"id": "membership-id-2", "user_id": "other-user", "role": "member", "joined_at": "2024-01-02"}
                    ]
                else:
                    # User's memberships
                    return [{"id": "membership-id-1", "team_id": "team-id", "role": "admin"}]
            elif table == "user_profiles":
                return [{"user_id": "user-id", "name": "Test User"}]
            return []

        mock_sb_select.side_effect = sb_select_side_effect
        mock_sb_update.return_value = [{"id": "team-id"}]
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        # Mock successful deletion
        mock_delete_response = MagicMock()
        mock_delete_response.status_code = 200
        mock_req_delete.return_value = mock_delete_response

        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'Bearer valid-token'})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])
        # Verify ownership was transferred (sb_update called for promotion and team update)
        self.assertGreaterEqual(mock_sb_update.call_count, 1)

    @patch('src.routes.account_route.sb_select')
    @patch('src.routes.account_route.sb_update')
    @patch('src.routes.account_route.sb_delete')
    @patch('src.routes.account_route.sb_insert')
    @patch('src.routes.account_route.requests.get')
    @patch('src.routes.account_route.requests.delete')
    @patch('src.routes.account_route.get_user_display_name')
    def test_delete_account_transfer_to_existing_admin(self, mock_get_name, mock_req_delete, 
                                                        mock_req_get, mock_sb_insert, mock_sb_delete,
                                                        mock_sb_update, mock_sb_select):
        """Test DELETE /api/account/delete transfers to existing admin when available"""
        # Mock authentication
        mock_auth_response = MagicMock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {"id": "user-id"}
        mock_req_get.return_value = mock_auth_response

        mock_get_name.return_value = "Test User"

        # Mock user is admin with another admin
        def sb_select_side_effect(table, params):
            if table == "team_membership":
                if "team_id" in params:
                    # All members of team (two admins)
                    return [
                        {"id": "membership-id-1", "user_id": "user-id", "role": "admin", "joined_at": "2024-01-01"},
                        {"id": "membership-id-2", "user_id": "other-admin", "role": "admin", "joined_at": "2024-01-02"}
                    ]
                else:
                    # User's memberships
                    return [{"id": "membership-id-1", "team_id": "team-id", "role": "admin"}]
            elif table == "user_profiles":
                return [{"user_id": "user-id", "name": "Test User"}]
            return []

        mock_sb_select.side_effect = sb_select_side_effect
        mock_sb_update.return_value = [{"id": "team-id"}]
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        # Mock successful deletion
        mock_delete_response = MagicMock()
        mock_delete_response.status_code = 200
        mock_req_delete.return_value = mock_delete_response

        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'Bearer valid-token'})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])

    @patch('src.routes.account_route.requests.get')
    @patch('src.routes.account_route.requests.delete')
    @patch('src.routes.account_route.sb_select')
    def test_delete_account_auth_deletion_fails(self, mock_sb_select, mock_req_delete, mock_req_get):
        """Test DELETE /api/account/delete handles auth deletion failure"""
        # Mock authentication
        mock_auth_response = MagicMock()
        mock_auth_response.status_code = 200
        mock_auth_response.json.return_value = {"id": "user-id"}
        mock_req_get.return_value = mock_auth_response

        # Mock no teams
        mock_sb_select.return_value = []

        # Mock failed auth deletion
        mock_delete_response = MagicMock()
        mock_delete_response.status_code = 500
        mock_delete_response.text = 'Internal Server Error'
        mock_req_delete.return_value = mock_delete_response

        response = self.app.post('/api/account/delete',
                                headers={'Authorization': 'Bearer valid-token'})
        
        self.assertEqual(response.status_code, 500)
        self.assertIn('error', response.json)


if __name__ == '__main__':
    unittest.main()
