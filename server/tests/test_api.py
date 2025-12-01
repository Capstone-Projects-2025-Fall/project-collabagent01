import unittest
from src.app import app

class APITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_api_health_check(self):
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {'status': 'healthy'})

    def test_api_summary(self):
        response = self.app.get('/api/summary')
        self.assertEqual(response.status_code, 200)
        self.assertIn('summary', response.json)

if __name__ == '__main__':
    unittest.main()