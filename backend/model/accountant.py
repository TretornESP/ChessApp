import uuid

from .match import Match
from .dbmanager import DBManager
from .request import Request, RequestType

class Accountant():
    def __init__(self, dbmanager):
        self.manager = dbmanager
        self.cpanel = None
    def new_cpanel(self):
        self.cpanel = str(uuid.uuid4())[:8]
        return self.cpanel
    def get_cpanel(self):
        return self.cpanel
    def pack_data(self):
        return {
            'match_count':self.get_all_matches_count(),
            'active_count':self.get_active_matches_count(),
            'finished_count':self.get_finished_matches_count(),
            'event_count':self.get_incidences_count(),
            'error_count':self.get_errors_count(),
        }
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
            match = self.manager.get_match(obj)
            if match.get_outcome() != None or match.match_end_time()!=0 or match.has_finished():
                count += 1
        return count
    def get_finished_matches_strings(self):
        res = []
        list = self.manager.get_all_matches()
        for obj in list:
            match = self.manager.get_match(obj)
            if match.get_outcome() != None:
                res.append(
                    {
                        'codigo': match.get_code(),
                        'blancas': match.get_white_name(),
                        'negras': match.get_black_name(),
                        'ganador': "blancas" if match.get_outcome().winner else "negras",
                        'hora_inicio': match.get_start_time(),
                        'hora_fin': match.get_finish_time()
                    }
                )
            elif match.match_end_time()!=0:
                res.append(
                    {
                        'codigo': match.get_code(),
                        'blancas': match.get_white_name(),
                        'negras': match.get_black_name(),
                        'ganador': "blancas" if match.match_end_time()==2 else "negras",
                        'hora_inicio': match.get_start_time(),
                        'hora_fin': match.get_finish_time()
                    }
                )
            elif match.has_finished():
                cause = match.get_finish_cause()
                if cause=="draw":
                    ganador = "empate"
                elif cause=="":
                    continue
                else:
                    ganador = "blancas" if cause.winner else "negras"

                res.append(
                    {
                        'codigo': match.get_code(),
                        'blancas': match.get_white_name(),
                        'negras': match.get_black_name(),
                        'ganador': ganador,
                        'hora_inicio': match.get_start_time(),
                        'hora_fin': match.get_finish_time()
                    }
                )
        return res
    def get_matches_strings(self):
        res = []
        list = self.manager.get_all_matches()
        for obj in list:
            res.append(self.manager.get_match(obj).get_reduced_status())
        return res
    def get_links_by_name(self, name):
        res = []
        list = self.manager.get_all_matches()
        for obj in list:
            result = self.manager.get_match(obj).get_link_by_name(name)
            if result!=None:
                res.append(result)
        return res
    def get_incidences_strings(self):
        res = []
        list = self.manager.get_all_matches()
        for obj in list:
            res.extend(self.manager.get_match(obj).get_all_reports())
        return res
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
