from enum import Enum



class StatusCodes(Enum):
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    NOT_FOUND = 404
    SERVER_ERROR = 500
    NOT_IMPLEMENTED = 501