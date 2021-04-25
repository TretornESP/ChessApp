from .match import Match
from .dbmanager import DBManager
from .request import Request, RequestType

class Accountant():
    def __init__(self, dbmanager):
        self.manager = dbmanager
    def get_all_matches_count(self):
        return self.manager.count()
    def get_active_matches_count(self):
        count = 0
        list = self.manager.get_all_matches()
        for obj in list:
            if self.manager.get_match(obj).timer_alive():
                count += 1
        return count
    def get_finished_matches_count(self):
        count = 0
        list = self.manager.get_all_matches()
        for obj in list:
            if self.manager.get_match(obj).get_outcome() != None:
                count += 1
        return count
    def get_incidences_count(self):
        count = 0
        list = self.manager.get_all_matches()
        for obj in list:
            count += len(self.manager.get_match(obj).get_event_reports())
        return count
    def get_errors_count(self):
        count = 0
        list = self.manager.get_all_matches()
        for obj in list:
            count += len(self.manager.get_match(obj).get_error_reports())
        return count
