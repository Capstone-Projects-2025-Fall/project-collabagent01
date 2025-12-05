import unittest
from src.app import app

class APITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_check(self):
        """Test the /health endpoint"""
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'status': 'healthy', 'service': 'collab-agent-backend'})

    def test_participant_status_event_missing_fields(self):
        """Test participant_status_event endpoint with missing required fields"""
        # Missing team_id/user_id should yield 400
        resp = self.app.post('/api/ai/participant_status_event', json={"joined": ["abc"], "left": []})
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.json)

    def test_process_snapshot_missing_fields(self):
        """Test process_snapshot endpoint with missing required fields"""
        # Missing required fields should yield 400
        resp = self.app.post('/api/ai/process_snapshot', json={})
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.json)

    def test_feed_missing_team_id(self):
        """Test feed endpoint with missing team_id"""
        # Missing team_id should yield 400
        resp = self.app.get('/api/ai/feed')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.json)

if __name__ == '__main__':
    unittest.main()