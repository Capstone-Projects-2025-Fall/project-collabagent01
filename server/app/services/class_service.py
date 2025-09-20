from app.controllers.database import client

def insert_new_class(data):
    """
    Inserts a new class into the 'classes' table.

    Args:
        data (dict): Should contain 'classTitle', 'classCode', 'instructorId', 'classHexColor', 'classImageCover'

    Returns:
        dict: The newly created class with its generated ID
    """

    new_class = {
        'class_title': data['classTitle'],
        'class_code': data['classCode'],
        'instructor_id': data['instructorId'],
        'class_hex_color': data['classHexColor'],
        'class_image_cover': data.get('classImageCover', None),
        'class_description': data.get('classDescription', None)
    }

    response = client.table("classes").insert(new_class).execute()

    if response.data:
        return response.data[0]
    else:
        raise Exception("Failed to insert new class into the database.")
    
def fetch_classes_by_instructor(instructor_id):
    """
    Fetches all classes taught by a given instructor.

    Args:
        instructor_id (str)

    Returns:
        list[dict]: List of class records
    """
    response = client.table("classes").select("*").eq("instructor_id", instructor_id).execute()

    if response.data is not None:
        return response.data
    else:
        raise Exception("Failed to retrieve classes for the given instructor.")

    
def insert_class_user(student_id, class_id):
    """
    Inserts a record into class_users table to join student and class.

    Args:
        student_id (str)
        class_id (str)

    Returns:
        dict: The inserted row
    """
    new_entry = {
        'student_id': student_id,
        'class_id': class_id,
    }

    response = client.table("class_users").insert(new_entry).execute()

    if response.data:
        return response.data[0]
    else:
        raise Exception("Failed to register user to class.")
