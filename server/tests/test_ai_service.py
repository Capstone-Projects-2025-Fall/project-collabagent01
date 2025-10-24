import unittest
from src.services.ai_service import AISummaryService

class TestAISummaryService(unittest.TestCase):

    def setUp(self):
        self.service = AISummaryService()

    def test_summarize_data(self):
        mock_data = [
            {"id": 1, "content": "This is a test."},
            {"id": 2, "content": "This is another test."}
        ]
        summary = self.service.summarize_data(mock_data)
        self.assertIsInstance(summary, str)
        self.assertGreater(len(summary), 0)

    def test_interact_with_gemini_api(self):
        response = self.service.interact_with_gemini_api("test input")
        self.assertIsNotNone(response)
        self.assertIn("summary", response)

if __name__ == '__main__':
    unittest.main()