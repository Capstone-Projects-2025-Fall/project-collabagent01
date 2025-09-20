from app.models.status_codes import StatusCodes



class BaseError(Exception):
    """Base class for custom errors."""
    def __init__(self, message, status_code=StatusCodes.BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        print("ERROR: " + message)
        super().__init__(message)


class UserAlreadyExistsError(BaseError):
    """Raised when trying to create a user with an existing email."""
    def __init__(self):
        super().__init__("Email already exists", StatusCodes.BAD_REQUEST)


class UserNotFoundError(BaseError):
    """Raised when a user is not found in the database."""
    def __init__(self):
        super().__init__("User not found", StatusCodes.NOT_FOUND)


class DatabaseError(BaseError):
    """Raised for general database errors."""
    def __init__(self, message="A database error occurred"):
        super().__init__(message, StatusCodes.SERVER_ERROR)


class AuthenticationError(BaseError):
    """Raised for authentication failures."""
    def __init__(self, message="Authentication failed"):
        super().__init__(message, StatusCodes.UNAUTHORIZED)

class ModelError(BaseError):
    def __init__(self, message="Suggestion generation failed"):
        super().__init__(message, StatusCodes.SERVER_ERROR)