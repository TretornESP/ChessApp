from sqlitedict import SqliteDict

class DBManager():
    def __init__(self):
        self._db = SqliteDict('./matches.sqlite', autocommit=True)
    def add(self, match):
        self._db[match.get_code()] = match
    def update(self, match):
        self.add(match)
    def remove(self, match):
        del self._db[match.get_code()]
    def empty(self):
        self._db.clear()
    def get_match(self, code):
        return self._db[code]
    def get_all_matches(self):
        list = []
        for key, val in self._db.iteritems():
            list.append(key)
        return list
