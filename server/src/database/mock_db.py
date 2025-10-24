# mock_db.py

# Sample mock data
mock_data = [
    {"id": 1, "title": "First Entry", "content": "This is the first entry."},
    {"id": 2, "title": "Second Entry", "content": "This is the second entry."},
    {"id": 3, "title": "Third Entry", "content": "This is the third entry."},
]

def get_all_entries():
    return mock_data

def get_entry_by_id(entry_id):
    for entry in mock_data:
        if entry["id"] == entry_id:
            return entry
    return None