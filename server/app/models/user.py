import bcrypt

class Base:
    # Dynamically get attribute
    def __init__(self, **kwargs):
        self._data = kwargs

    def to_json(self):
        return self._data

    def __getattr__(self, name):
        return self._data.get(name)

    def __getitem__(self, key):
        return self._data.get(key)

    def get_user(self):
        return self
    
class User(Base):
    pass

class Class(Base):
    pass

class Suggestion(Base):
    pass


    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')