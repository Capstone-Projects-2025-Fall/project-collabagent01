from enum import Enum
from flask import jsonify

class event_type(Enum):
    MODEL_GENERATE = 1
    USER_ACCEPT = 2
    USER_REJECT = 3

class Log:
    id: int
    event: str
    timestamp: str
    time_lapse: int
    metadata: dict

    def __init__(self, id: int, event: str, timestamp: str, time_lapse: int, metadata: dict):
        self.id = id
        self.event = event
        self.timestamp = timestamp
        self.time_lapse = time_lapse
        self.metadata = metadata

    def get_log(self):
        return self
    
    def to_json(self):
        return jsonify(self)