def format_data(data):
    """Format data for display."""
    return {key: str(value) for key, value in data.items()}

def validate_input(data, required_fields):
    """Validate input data against required fields."""
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")
    return True