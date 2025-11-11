class AISummaryService:
    def __init__(self, mock_db):
        self.mock_db = mock_db

    def fetch_data(self):
        # Fetch data from the mock database
        return self.mock_db.get_data()

    def summarize_data(self, data):
        # Summarize the data (this is a placeholder for actual summarization logic)
        return {
            "summary": f"Total records: {len(data)}",
            "data": data
        }

    def get_summary(self):
        data = self.fetch_data()
        return self.summarize_data(data)