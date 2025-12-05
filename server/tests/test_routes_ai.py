import unittest
from unittest.mock import patch, MagicMock
import os

# Set up test environment variables
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'
os.environ['GEMINI_API_KEY'] = 'test-gemini-key'
os.environ['SIMPLE_MODEL'] = 'gemini-1.5-flash'
os.environ['ADVANCE_MODEL'] = 'gemini-1.5-pro'

from src.app import app


class AIRouteTestCase(unittest.TestCase):
    """Test cases for api_route.py (AI) endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    # ===== process_snapshot tests =====
    def test_process_snapshot_missing_snapshot_id(self):
        """Test POST /api/ai/process_snapshot without snapshot_id"""
        response = self.app.post('/api/ai/process_snapshot', json={
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)
        self.assertIn('snapshot_id', response.json['error'])

    @patch('src.routes.api_route.sb_select')
    def test_process_snapshot_not_found(self, mock_sb_select):
        """Test POST /api/ai/process_snapshot with non-existent snapshot"""
        mock_sb_select.return_value = []

        response = self.app.post('/api/ai/process_snapshot', json={
            "snapshot_id": "nonexistent-id",
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 404)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_select')
    @patch('src.routes.api_route.sb_insert')
    @patch('src.routes.api_route.simple_model.generate_content')
    def test_process_snapshot_success(self, mock_generate, mock_sb_insert, mock_sb_select):
        """Test POST /api/ai/process_snapshot successfully processes snapshot"""
        # Mock snapshot data
        mock_sb_select.return_value = [{
            "id": "snapshot-id",
            "user_id": "user-id",
            "file_path": "src/test.py",
            "changes": "Added new function",
            "updated_at": "2024-01-01"
        }]

        # Mock AI response
        mock_ai_response = MagicMock()
        mock_ai_response.text = "Added utility function in src/test.py"
        mock_generate.return_value = mock_ai_response

        # Mock feed insertion
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        response = self.app.post('/api/ai/process_snapshot', json={
            "snapshot_id": "snapshot-id",
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('inserted', response.json)
        self.assertIn('summary', response.json)

    # ===== get_feed tests =====
    def test_get_feed_missing_team_id(self):
        """Test GET /api/ai/feed without team_id"""
        response = self.app.get('/api/ai/feed')
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_select')
    def test_get_feed_success(self, mock_sb_select):
        """Test GET /api/ai/feed returns activity feed"""
        mock_sb_select.return_value = [
            {
                "id": "feed-1",
                "team_id": "team-id",
                "user_id": "user-id-1",
                "summary": "Added feature",
                "file_path": "src/test.py",
                "activity_type": "ai_summary",
                "created_at": "2024-01-01",
                "pinned": False,
                "file_snapshots": {"changes": "diff content", "snapshot": "snapshot content"}
            }
        ]

        response = self.app.get('/api/ai/feed?team_id=team-id')
        
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(len(data), 1)
        self.assertIn('changes', data[0])
        self.assertIn('snapshot', data[0])

    @patch('src.routes.api_route.sb_select')
    def test_get_feed_with_limit(self, mock_sb_select):
        """Test GET /api/ai/feed respects limit parameter"""
        mock_sb_select.return_value = []

        self.app.get('/api/ai/feed?team_id=team-id&limit=10')
        
        # Verify the limit was passed
        call_params = mock_sb_select.call_args[0][1]
        self.assertEqual(call_params['limit'], '10')

    # ===== live_share_event tests =====
    def test_live_share_event_missing_fields(self):
        """Test POST /api/ai/live_share_event with missing required fields"""
        response = self.app.post('/api/ai/live_share_event', json={
            "event_type": "started"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_insert')
    def test_live_share_event_started(self, mock_sb_insert):
        """Test POST /api/ai/live_share_event with started event"""
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        response = self.app.post('/api/ai/live_share_event', json={
            "event_type": "started",
            "session_id": "session-id",
            "team_id": "team-id",
            "user_id": "user-id",
            "display_name": "Test User",
            "session_link": "https://session-link.com"
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('event_header', response.json)
        self.assertIn('started hosting', response.json['event_header'])

    @patch('src.routes.api_route.sb_select')
    @patch('src.routes.api_route.sb_insert')
    @patch('src.database.db.sb_update')
    def test_live_share_event_ended(self, mock_sb_update, mock_sb_insert, mock_sb_select):
        """Test POST /api/ai/live_share_event with ended event"""
        # Mock participants
        mock_sb_select.return_value = [
            {"github_username": "user1", "peer_number": 2},
            {"github_username": "user2", "peer_number": 3}
        ]
        mock_sb_insert.return_value = [{"id": "feed-id"}]
        mock_sb_update.return_value = []

        response = self.app.post('/api/ai/live_share_event', json={
            "event_type": "ended",
            "session_id": "session-id",
            "team_id": "team-id",
            "user_id": "user-id",
            "display_name": "Test User",
            "duration_minutes": 45
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('event_header', response.json)
        self.assertIn('45-minute', response.json['event_header'])

    # ===== participant_status_event tests =====
    def test_participant_status_event_missing_team_id(self):
        """Test POST /api/ai/participant_status_event without team_id"""
        response = self.app.post('/api/ai/participant_status_event', json={
            "user_id": "user-id",
            "joined": ["user1"]
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    def test_participant_status_event_no_changes(self):
        """Test POST /api/ai/participant_status_event with empty joined/left arrays"""
        response = self.app.post('/api/ai/participant_status_event', json={
            "team_id": "team-id",
            "user_id": "user-id",
            "joined": [],
            "left": []
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_select')
    @patch('src.routes.api_route.sb_insert')
    def test_participant_status_event_joined(self, mock_sb_insert, mock_sb_select):
        """Test POST /api/ai/participant_status_event with joined users"""
        # Mock user profiles
        mock_sb_select.return_value = [
            {"user_id": "user1", "name": "User One"}
        ]
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        response = self.app.post('/api/ai/participant_status_event', json={
            "team_id": "team-id",
            "user_id": "admin-id",
            "joined": ["user1"],
            "left": []
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('event_header', response.json)
        self.assertIn('joined the team', response.json['event_header'])

    @patch('src.routes.api_route.sb_select')
    @patch('src.routes.api_route.sb_insert')
    def test_participant_status_event_left(self, mock_sb_insert, mock_sb_select):
        """Test POST /api/ai/participant_status_event with left users"""
        mock_sb_select.return_value = [
            {"user_id": "user1", "name": "User One"}
        ]
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        response = self.app.post('/api/ai/participant_status_event', json={
            "team_id": "team-id",
            "user_id": "admin-id",
            "joined": [],
            "left": ["user1"]
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('left the team', response.json['event_header'])

    # ===== live_share_update_link tests =====
    def test_live_share_update_link_missing_fields(self):
        """Test POST /api/ai/live_share_update_link with missing fields"""
        response = self.app.post('/api/ai/live_share_update_link', json={
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.database.db.sb_update')
    def test_live_share_update_link_success(self, mock_sb_update):
        """Test POST /api/ai/live_share_update_link successfully updates link"""
        mock_sb_update.return_value = []

        response = self.app.post('/api/ai/live_share_update_link', json={
            "team_id": "team-id",
            "session_id": "session-id",
            "session_link": "https://new-link.com"
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])

    # ===== cleanup_orphaned_pins tests =====
    def test_cleanup_orphaned_pins_missing_team_id(self):
        """Test POST /api/ai/cleanup_orphaned_pins without team_id"""
        response = self.app.post('/api/ai/cleanup_orphaned_pins', json={})
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.database.db.sb_update')
    def test_cleanup_orphaned_pins_success(self, mock_sb_update):
        """Test POST /api/ai/cleanup_orphaned_pins successfully cleans up pins"""
        mock_sb_update.return_value = []

        response = self.app.post('/api/ai/cleanup_orphaned_pins', json={
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['success'])

    # ===== live_share_summary tests =====
    def test_live_share_summary_missing_fields(self):
        """Test POST /api/ai/live_share_summary with missing required fields"""
        response = self.app.post('/api/ai/live_share_summary', json={
            "session_id": "session-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_insert')
    def test_live_share_summary_success(self, mock_sb_insert):
        """Test POST /api/ai/live_share_summary creates snapshot"""
        mock_sb_insert.return_value = [{"id": "snapshot-id"}]

        response = self.app.post('/api/ai/live_share_summary', json={
            "session_id": "session-id",
            "team_id": "team-id",
            "user_id": "user-id",
            "changes": "git diff content"
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('snapshot_id', response.json)

    # ===== task_recommendations tests =====
    def test_task_recommendations_missing_team_id(self):
        """Test POST /api/ai/task_recommendations without team_id"""
        response = self.app.post('/api/ai/task_recommendations', json={
            "user_id": "user-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    def test_task_recommendations_missing_user_id(self):
        """Test POST /api/ai/task_recommendations without user_id"""
        response = self.app.post('/api/ai/task_recommendations', json={
            "team_id": "team-id"
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_select')
    def test_task_recommendations_no_tasks(self, mock_sb_select):
        """Test POST /api/ai/task_recommendations with no unassigned tasks"""
        response = self.app.post('/api/ai/task_recommendations', json={
            "team_id": "team-id",
            "user_id": "user-id",
            "unassigned_tasks": []
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['recommendations_count'], 0)

    @patch('src.routes.api_route.sb_select')
    def test_task_recommendations_no_team_members(self, mock_sb_select):
        """Test POST /api/ai/task_recommendations when team has no members"""
        mock_sb_select.return_value = []

        response = self.app.post('/api/ai/task_recommendations', json={
            "team_id": "team-id",
            "user_id": "user-id",
            "unassigned_tasks": [{"key": "PROJ-1", "summary": "Test"}]
        })
        
        self.assertEqual(response.status_code, 404)
        self.assertIn('error', response.json)

    @patch('src.routes.api_route.sb_select')
    @patch('src.routes.api_route.sb_insert')
    @patch('src.routes.api_route.advance_model.generate_content')
    def test_task_recommendations_success(self, mock_generate, mock_sb_insert, mock_sb_select):
        """Test POST /api/ai/task_recommendations successfully creates recommendations"""
        # Mock team members and profiles
        def sb_select_side_effect(table, params):
            if table == "team_membership":
                return [{"user_id": "user1", "role": "member"}]
            elif table == "user_profiles":
                return [{
                    "user_id": "user1",
                    "name": "Developer One",
                    "interests": ["Python", "Flask"],
                    "custom_skills": ["Testing"]
                }]
            return []

        mock_sb_select.side_effect = sb_select_side_effect

        # Mock AI response
        mock_ai_response = MagicMock()
        mock_ai_response.text = "PROJ-123|Developer One|Has Python and Flask skills needed for this task"
        mock_generate.return_value = mock_ai_response

        # Mock feed insertion
        mock_sb_insert.return_value = [{"id": "feed-id"}]

        response = self.app.post('/api/ai/task_recommendations', json={
            "team_id": "team-id",
            "user_id": "admin-id",
            "unassigned_tasks": [
                {"key": "PROJ-123", "summary": "Build authentication", "description": "Create login page"}
            ]
        })
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('recommendations_count', response.json)
        self.assertTrue(response.json['success'])

    @patch('src.routes.api_route.sb_select')
    def test_task_recommendations_no_skills(self, mock_sb_select):
        """Test POST /api/ai/task_recommendations when no members have skills"""
        def sb_select_side_effect(table, params):
            if table == "team_membership":
                return [{"user_id": "user1", "role": "member"}]
            elif table == "user_profiles":
                return [{
                    "user_id": "user1",
                    "name": "Developer One",
                    "interests": [],
                    "custom_skills": []
                }]
            return []

        mock_sb_select.side_effect = sb_select_side_effect

        response = self.app.post('/api/ai/task_recommendations', json={
            "team_id": "team-id",
            "user_id": "admin-id",
            "unassigned_tasks": [{"key": "PROJ-1", "summary": "Test"}]
        })
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('No team members with skills', response.json['error'])


if __name__ == '__main__':
    unittest.main()
