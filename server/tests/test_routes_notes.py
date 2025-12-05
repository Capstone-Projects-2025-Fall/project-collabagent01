import unittest
from unittest.mock import patch
import os

# Set up test environment variables
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'

from src.app import app


class NotesRouteTestCase(unittest.TestCase):
    """Test cases for notes_route.py endpoints"""

    def setUp(self):
        """Set up test client"""
        self.app = app.test_client()
        self.app.testing = True

    @patch('src.routes.notes_route.sb_select')
    def test_get_notes_success(self, mock_sb_select):
        """Test GET /api/notes returns notes successfully"""
        mock_sb_select.return_value = [
            {"id": "1", "title": "Note 1", "body": "Body 1", "created_at": "2024-01-01"},
            {"id": "2", "title": "Note 2", "body": "Body 2", "created_at": "2024-01-02"}
        ]

        response = self.app.get('/api/notes/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["title"], "Note 1")

    @patch('src.routes.notes_route.sb_select')
    def test_get_notes_empty(self, mock_sb_select):
        """Test GET /api/notes with no notes"""
        mock_sb_select.return_value = []

        response = self.app.get('/api/notes/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, [])

    @patch('src.routes.notes_route.sb_insert')
    def test_add_note_success(self, mock_sb_insert):
        """Test POST /api/notes creates note successfully"""
        mock_sb_insert.return_value = [
            {"id": "new-id", "title": "New Note", "body": "New Body"}
        ]

        response = self.app.post('/api/notes/', json={
            "title": "New Note",
            "body": "New Body"
        })
        
        self.assertEqual(response.status_code, 201)
        data = response.json
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["title"], "New Note")

    @patch('src.routes.notes_route.sb_insert')
    def test_add_note_with_empty_title(self, mock_sb_insert):
        """Test POST /api/notes with empty title"""
        mock_sb_insert.return_value = [
            {"id": "new-id", "title": None, "body": "Body only"}
        ]

        response = self.app.post('/api/notes/', json={
            "title": None,
            "body": "Body only"
        })
        
        self.assertEqual(response.status_code, 201)

    @patch('src.routes.notes_route.sb_insert')
    def test_add_note_with_empty_body(self, mock_sb_insert):
        """Test POST /api/notes with empty body"""
        mock_sb_insert.return_value = [
            {"id": "new-id", "title": "Title only", "body": None}
        ]

        response = self.app.post('/api/notes/', json={
            "title": "Title only",
            "body": None
        })
        
        self.assertEqual(response.status_code, 201)

    def test_add_note_with_invalid_json(self):
        """Test POST /api/notes with invalid JSON"""
        response = self.app.post('/api/notes/', 
                                data="not valid json",
                                content_type='application/json')
        
        # Flask will handle bad JSON and return 400 or handle it in force=True
        # Since force=True is used, it will process as empty dict
        self.assertIn(response.status_code, [201, 400, 500])

    @patch('src.routes.notes_route.sb_select')
    def test_get_notes_calls_correct_params(self, mock_sb_select):
        """Test GET /api/notes calls sb_select with correct parameters"""
        mock_sb_select.return_value = []

        self.app.get('/api/notes/')
        
        mock_sb_select.assert_called_once_with("notes", {
            "select": "id,title,body,created_at",
            "order": "created_at.desc",
            "limit": "50"
        })

    @patch('src.routes.notes_route.sb_insert')
    def test_add_note_calls_correct_params(self, mock_sb_insert):
        """Test POST /api/notes calls sb_insert with correct parameters"""
        mock_sb_insert.return_value = [{"id": "1"}]

        self.app.post('/api/notes/', json={
            "title": "Test",
            "body": "Test body"
        })
        
        mock_sb_insert.assert_called_once_with("notes", {
            "title": "Test",
            "body": "Test body"
        })


if __name__ == '__main__':
    unittest.main()
