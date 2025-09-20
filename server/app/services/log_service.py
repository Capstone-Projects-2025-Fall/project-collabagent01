from app.controllers.database import client
from app.models.response import *



def log_event(event):
    """Logs an event to the database."""
    try:
        client.table("logs").insert(event).execute()
        
    except Exception as e:
        print(f"Error logging event: {e}")
        raise e


def log_suggestion(suggestion):
    """
    Logs an event by inserting it into the 'Logs' table in the database.

    Args:
        event (dict): A dictionary containing event details. Expected keys are:
            - 'event': The name of the event.
            - 'time_lapse': A textual description of the event.
            - 'metadata': Additional data associated with the event.

    Raises:
        Exception: If there is an error inserting the log into the database.
    """
    try:
        response = client.table("suggestions").insert(suggestion).execute()
        if response.data:
            suggestion['id'] = response.data[0]['id']
            return suggestion
        else:
            raise Exception("No data returned from insert operation")
    except Exception as e:
        print(f"Error logging suggestion: {e}")
        raise e
    
def log_line_suggestion(suggestion):
    try:
        response = client.table("line_suggestions").insert(suggestion).execute()
        if response.data:
            suggestion['id'] = response.data[0]['id']
            return suggestion
        else:
            raise Exception("No data returned from insert")
    except Exception as e:
        print(f"Error logging line suggestion: {e}")
        raise e

def get_all_logs():
    """
    Retrieves all logs stored in the 'Logs' table.

    Returns:
        list: A list of dictionaries containing all logs.

    Raises:
        Exception: If there is an error fetching the logs from the database.
    """
    try:
        response = client.table("logs").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching logs: {e}")
        raise e

def get_logs_by_user(user_id, user_section_id=None, user_class_id=None):
    """
    Retrieves all logs associated with a specific user.

    Args:
        user_id (str): The ID of the user whose logs are to be fetched.

    Returns:
        list: A list of dictionaries containing logs for the specified user.

    Raises:
        Exception: If there is an error fetching logs for the user.
    """
    try:
        query = client.table("logs").select("*").eq("metadata->>user_id", str(user_id))

        if user_section_id is not None:
            query = query.eq("metadata->>user_section_id", str(user_section_id))

        if user_class_id is not None:
            query = query.eq("metadata->>user_class_id", str(user_class_id))

        response = query.execute()

        return response.data
    except Exception as e:
        print(f"Error fetching logs for user {user_id}: {e}")
        raise e


def get_ai_usage():
    """
    Retrieves AI usage statistics from the database.

    Returns:
        dict: A dictionary containing AI usage statistics.

    Raises:
        Exception: If there is an error fetching AI usage data from the database.
    """
    try:
        response = client.table("ai_usage").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching AI usage data: {e}")
        raise e
    
def get_all_data_from_db():
    """
    Retrieves all data from the database.

    Returns:
        list: A list of dictionaries containing all data from the database.

    Raises:
        Exception: If there is an error fetching data from the database.
    """
    try:
        users = client.table("users").select("*").execute()
        class_users = client.table("class_users").select("*").execute()
        classes = client.table("classes").select("*").execute()
        logs = client.table("logs").select("*").execute()
        suggestion = client.table("suggestions").select("*").execute()
        user_section_questions = client.table("user_section_questions").select("*").execute()
        user_sections = client.table("user_sections").select("*").execute()

        response = {
            "users": users.data,
            "class_users": class_users.data,
            "classes": classes.data,
            "logs": logs.data,
            "suggestion": suggestion.data,
            "user_section_questions": user_section_questions.data,
            "user_sections": user_sections.data
        }
        return response
    except Exception as e:
        print(f"Error fetching all data: {e}")
        raise e

def get_logs_by_class(class_id):
    """
    Retrieves all logs for users in a specific class.

    Args:
        class_id (str): The class ID to filter logs by.

    Returns:
        list: A list of logs matching the class ID.
    """
    try:
        query = client.table("logs").select("*").eq("metadata->>user_class_id", str(class_id))
        response = query.execute()

        if not response.data:
            return []

        return response.data
    except Exception as e:
        print(f"Error fetching logs for class {class_id}: {e}")
        raise e
