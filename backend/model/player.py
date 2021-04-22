
class Player():
    def __init__(self, namespace):
        self.sid = namespace
        self.ready = False
    def populate(self, match, code):
        self.match = match
        self.code = code
        self.ready = True
    def is_ready(self):
        return self.ready
    def get_session(self):
        return self.sid
    def get_match(self):
        return self.match
    def get_code(self):
        return self.code
