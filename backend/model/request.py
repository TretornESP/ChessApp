from enum import Enum
from datetime import datetime

class RequestType(Enum):
    ILLEGAL = "jugada ilegal"
    ADMIN = "arbitro solicitado"
    ERROR = "error"

class Request():
    def __init__(self, type, requester, info = None):
        self.type = type
        self.time = datetime.now()
        self.requester = requester
        self.info = info
    def get_type(self):
        return self.type
    def get(self):
        return self.time.strftime("%d/%m/%Y %H:%M:%S") + " " + self.requester + " informa: " + self.type.value
    def get_info(self):
        return self.info
    def get_json(self):
        return {'type': self.type.value, 'requester': self.requester, 'time': self.time.strftime("%d/%m/%Y %H:%M:%S"), 'extra': "" if self.info==None else self.info}
