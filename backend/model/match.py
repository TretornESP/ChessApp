import chess
import uuid
from threading import Timer
import threading

from .request import Request, RequestType

class Match():
    def __init__(self, server_config, white_time=300, black_time=300, map=chess.Board()):
        self.server_config = server_config
        self.code = str(uuid.uuid4())
        self.white = str(uuid.uuid4())[:8]
        self.black = str(uuid.uuid4())[:8]
        self.admin = str(uuid.uuid4())[:8]
        self.white_joined = False
        self.black_joined = False
        self.white_sid = None
        self.black_sid = None
        self.admin_sid = None
        self.initial_white_time = white_time
        self.initial_black_time = black_time
        self.white_time = white_time
        self.black_time = black_time
        self.map = map
        self.timer = threading.Timer(1, self.time)
        self.kill = True
        self.events = []
    #Timer tiene un lock implicito y no puede ser guardado!!
    def __getstate__(self):
        state = self.__dict__.copy()
        del state['timer']
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self.timer = threading.Timer(1, self.time)

    def push_event(self, type, requester, extra=None):
        self.events.append(Request(type, requester, extra))

    def get_events(self):
        return self.events

    def get_specific_reports(self, type):
        list = []
        for evt in self.events:
            if evt.get_type()==type:
                list.append(evt)
        return list
    def get_error_reports(self):
        list = []
        for evt in self.events:
            if evt.get_type()==RequestType.ERROR:
                list.append(evt)
        return list
    def get_event_reports(self):
        list = []
        for evt in self.events:
            if evt.get_type()!=RequestType.ERROR:
                list.append(evt)
        return list
    def match_start(self):
        print(self.white_joined, self.black_joined)
        if self.white_joined and self.black_joined:
            self.start_timer()
            return True
        return False
    def white_has_joined(self):
        return self.white_joined
    def black_has_joined(self):
        return self.black_joined
    def match_pause(self):
        self.started = False

    #Check if time has run out
    #RETURN: 1 Whites have no time
    # 2: blacks have no time
    # 0: Everyone has time
    def match_end_time(self):
        if self.black_time == 0:
            self.started = False
            return 2
        if self.white_time == 0:
            self.started = False
            return 1
        return 0
    def get_white_sid(self):
        return self.white_sid
    def get_black_sid(self):
        return self.black_sid
    def get_admin_sid(self):
        return self.admin_sid
    def get_code(self):
        return self.code
    def get_white(self):
        return self.white
    def get_black(self):
        return self.black
    def get_admin(self):
        return self.admin
    def color_at(self, coord):
        return self.map.piece_at(coord).color
    def print_map(self):
        print(self.map)
    def change_turn(self, turn):
        self.map.turn = turn
    def reset_match(self):
        self.stop_timer()
        self.white_time = self.initial_white_time
        self.black_time = self.initial_black_time
        self.map.reset_board()
    def pop(self):
        try:
            return self.map.pop()
        except IndexError:
            return None
    def get_map(self):
        return self.map.board_fen()
    def get_turn(self):
        return self.map.turn
    def get_stack(self):
        return self.map.move_stack
    def get_outcome(self):
        return self.map.outcome()
    def get_outcome_draw(self):
        return self.map.outcome(True)
    def is_admin(self, player):
        return (self.admin == player)
    def is_viewer(self, player):
        return ("viewer" == player)
    def set_time(self, player, time):
        if player:
            self.white_time = time
        else:
            self.black_time = time
    def set_white_time(self, time):
        self.white_time = time
    def set_black_time(self, time):
        self.black_time = time
    def get_white_time(self):
        return self.white_time
    def get_black_time(self):
        return self.black_time
    def timer_alive(self):
        return self.timer.is_alive()
    def start_timer(self):
        self.kill = False
        self.time()
    def stop_timer(self):
        self.kill = True
    def get_status(self):
        return {
            "whites_link": self.get_whites_link,
            "blacks_link": self.get_blacks_link,
            "admins_link": self.get_admins_link
        }
    def get_whites_link(self):
        return self.server_config[self.server_config['active']]['host'] +"/match/"+self.get_code()+"/join/"+self.get_white()
    def get_blacks_link(self):
        return self.server_config[self.server_config['active']]['host'] +"/match/"+self.get_code()+"/join/"+self.get_black()
    def get_admins_link(self):
        return self.server_config[self.server_config['active']]['host'] +"/match/"+self.get_code()+"/join/"+self.get_admin()

    def pack_data(self):
        return {'turn':self.map.turn, 'data':self.map.board_fen(), 'whites_timer':self.white_time, 'blacks_timer':self.black_time, 'start_timer': not self.kill}
    def get_stack_as_string(self):
        #This is way faster
        list = []
        for m in self.map.move_stack:
            list.append(m.uci())
        return ', '.join(list)
    def as_json(self):
        return {"code": self.code, "white": self.white, "black": self.black, "turn":self.turn, "map":self.map.board_fen()}
    def get_color(self, player):
        if player == self.black:
            return "black"
        elif player == self.white:
            return "white"
        elif player == self.admin:
            return "admin"
        elif player == "viewer":
            return "viewer"
        else:
            return "unknown"
    def valid_turn(self, player):
        if player==self.white:
            return self.map.turn
        elif player==self.black:
            return not self.map.turn
        else:
            return False
    def crowning(self, to):
        if self.map.piece_at(to).piece_type==chess.PAWN:
            if self.map.turn:
                if chess.square_rank(to)==8:
                    return True
            else:
                if chess.square_rank(to)==1:
                    return True
        return False

    #return codes:
    #SUCCESS: 0 white joined,          1 black joined, 2 admin joined
    #ERROR:  -1 White already joined, -2 Black Already Joined
    #        -3 Invalid player code
    def join_match(self, player, sid):
        if player == self.white:
            self.white_sid = sid
            self.white_joined = True
            return 0
        elif player == self.black:
            self.black_sid = sid
            self.black_joined = True
            return 1
        elif player == self.admin:
            self.admin_sid = sid
            return 2
        elif player == "viewer":
            return 3
        return -3

    #return codes:
    #SUCCESS: 0 Black left, 1 White left, 2 Admin left
    #ERROR:  -1 Invalid player code
    def leave_match(self, player):
        if player == self.white:
            self.white_sid = None
#            self.white_joined = False #Uncomment this to be kind
            return 0
        elif player == self.black:
            self.black_sid = None
#            self.black_joined = False
            return 1
        elif player == self.admin:
            self.admin_sid = None
            return 2
        return -1

    def init_board(self):
        self.map = chess.Board()

    def time(self):
        if self.kill == False:
            self.timer = threading.Timer(1, self.time)
            self.timer.start()
        if self.map.turn:
            self.white_time -= 1
            if self.white_time <= 0:
                self.kill = True
        else:
            self.black_time -=1
            if self.black_time <= 0:
                self.kill = True

    def force_move(self, move):
        self.map.push(move.get_move())

    def make_move(self, move):
        chess_move = move.get_move()
        if chess_move in self.map.legal_moves:
            m = self.map.san(chess_move)
            if self.map.turn:
                print('whites moved: ' + m)
            else:
                print('blacks moved: ' + m)
            self.map.push(chess_move)
            return m
        else:
            if self.map.turn:
                print('illegal movement by whites')
            else:
                print('illegal movement by blacks')
            return None
