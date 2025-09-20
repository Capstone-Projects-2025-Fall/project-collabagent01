from flask import jsonify

class Suggestion:
    id: int
    created_at: str
    prompt: str
    suggestion_text: str
    has_bug: bool
    model: str

    def __init__(self, id: int, created_at: str, prompt: str, suggestion_text: str, has_bug: bool, model: str):
        self.id = id
        self.created_at = created_at
        self.prompt = prompt
        self.suggestion_text = suggestion_text,
        self.has_bug = has_bug
        self.model = model

    def get_suggestion(self):
        return self
    
    def to_json(self):
        return jsonify(self.__dict__)