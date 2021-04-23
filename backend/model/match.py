import chess
import uuid
from threading import Timer
import threading
#
#white_crowner = {
#    "crown_rook": 8,
#    "crown_horse": 9,
#    "crown_bishop": 10,
#    "crown_queen": 11
#}
#black_crowner = {
#    "crown_rook": 1,
#    "crown_horse": 2,
#    "crown_bishop": 3,
#    "crown_queen": 4
#}
#white_turn = 0
#black_turn = 1
#
#br =  1
#bh =  2
#bb =  3
#bq =  4
#bk =  5
#bp =  6
#z =  7
#wr =  8
#wh =  9
#wb = 10
#wq = 11
#wk = 12
#wp = 13
#
#translator =  [
#    {'key': "&#9820", 'team': "black_team", 'clue': 'br', 'api': 'r'},
#    {'key': "&#9822", 'team': "black_team", 'clue': 'bh', 'api': 'n'},
#    {'key': "&#9821", 'team': "black_team", 'clue': 'bb', 'api': 'b'},
#    {'key': "&#9819", 'team': "black_team", 'clue': 'bq', 'api': 'q'},
#    {'key': "&#9818", 'team': "black_team", 'clue': 'bk', 'api': 'k'},
#    {'key': "&#9823", 'team': "black_team", 'clue': 'bp', 'api': 'p'},
#    {'key': "&#9814", 'team': "white_team", 'clue': 'wr', 'api': 'R'},
#    {'key': "&#9816", 'team': "white_team", 'clue': 'wh', 'api': 'N'},
#    {'key': "&#9815", 'team': "white_team", 'clue': 'wb', 'api': 'B'},
#    {'key': "&#9813", 'team': "white_team", 'clue': 'wq', 'api': 'Q'},
#    {'key': "&#9812", 'team': "white_team", 'clue': 'wk', 'api': 'K'},
#    {'key': "&#9817", 'team': "white_team", 'clue': 'wp', 'api': 'P'},
#    {'key': "", 'team': "neutral"}
#]

class Match():
    def __init__(self, white_time=300, black_time=300, map=chess.Board()):
        self.code = str(uuid.uuid4())
        self.white = str(uuid.uuid4())[:8]
        self.black = str(uuid.uuid4())[:8]
        self.white_joined = False
        self.black_joined = False
        self.white_sid = None
        self.black_sid = None
        self.white_time = white_time
        self.black_time = black_time
        self.map = map
        self.timer = threading.Timer(1, self.time)
        self.kill = False

    #Timer tiene un lock implicito y no puede ser guardado!!
    def __getstate__(self):
        state = self.__dict__.copy()
        del state['timer']
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self.timer = threading.Timer(1, self.time)

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
    def get_code(self):
        return self.code
    def get_white(self):
        return self.white
    def get_black(self):
        return self.black
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
        self.timer.stop()
    def pack_data(self):
        print("WT: " + str(self.white_time))
        print("BT: " + str(self.black_time))
        return {'turn':self.map.turn, 'data':self.map.board_fen(), 'whites_timer':self.white_time, 'blacks_timer':self.black_time, 'start_timer': self.timer_alive()}
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
        else:
            return "white"
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
    #SUCCESS: 0 white joined,          1 black joined
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
        return -3

    #return codes:
    #SUCCESS: 0 Black left, 1 White left
    #ERROR:  -1 Invalid player code
    def leave_match(self, player):
        if player == self.white:
            self.white_sid = None
            print("WHITE CUAK")
#            self.white_joined = False #Uncomment this to be kind
            return 0
        elif player == self.black:
            self.black_sid = None
            print("BLACK CUAK")
#            self.black_joined = False
            return 1
        return -1

    def init_board(self):
        self.map = chess.Board()

    def time(self):
        if self.kill == False:
            self.timer = threading.Timer(1, self.time)
            self.timer.start()
        print("TICK TACK")
        if self.map.turn:
            self.white_time -= 1
            if self.white_time <= 0:
                self.kill = True
        else:
            self.black_time -=1
            if self.black_time <= 0:
                self.kill = True

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


#        if code > 0:
#            app.logger.info('['+str(self.code)+'] ' + str(self.turn) + ' moving C:' + str(code))
#            if code == 3:
#                self.map[move.get_to()] = white_crowner[move.get_crown()]
#            elif code == 4:
#                self.map[move.get_to()] = black_crowner[move.get_crown()]
#            else:
#                self.map[move.get_to()] = self.map[move.get_from()]
#            self.map[move.get_from()] = z
#            self.turn = (1 - self.turn)
#            return code
#        else:
#            app.logger.info('invalid movement, code: ' + str(code))
#            return move.invalid_move()

#CHECKS IF ANYONE CAN CROWN
#RETURN 0 No one crowns, 1 White can crown, 2 Black can crown
#    def check_crown(self, move):
#        if self.map[move.get_from()] == wp:
#            if 0 <= move.get_to() <= 7:
#                return 1
#            return 0
#        if self.map[move.get_from()] == bp:
#            if 56 <= move.get_to() <= 63:
#                return 2
#            return 0
#        return 0

#CHECKS IF SOMEONE IS CASTLING AND IF IT IS VALID
#WE ONLY CHECK FOR THE PIECES BEING IN PLACE, NOT FOR PREVIOUS MOVES NOR KING CHECKS
#RETURN: SUCCESS: 0 No one castles, 1 Whites are and can castle, 2 Blacks are and can castle
#        ERROR:  -1 Whites are castling but cannot, -2 Blacks are castling but cannot
#
#    def check_castling(self, move):
#        if (abs(move.get_from() - move.get_to()) == 2):
#            if (self.map[move.get_from()] == wk):
#                #Whites are trying to castle
#                app.logger.info("Whites are trying to castle")
#                if self.white_castling_criteria:
#                    #Whites have never moved king
#                    app.logger.info("Whites have never moved king")
#                    if move.get_from() == 60 and move.get_to() == 62 and self.map[60] == wk:
#                        #Whites castling on kings flank
#                        app.logger.info("Whites castling on kings flank")
#                        if (self.map[62] == z and self.map[61] == z and self.map[63] == wr):
#                            app.logger.info("Whites castled")
#                            self.map[63] = z
#                            self.map[61] = wr
#                            self.white_castling_criteria = False
#                            return 1
#                        else:
#                            return -1
#                    if move.get_from() == 60 and move.get_to() == 58 and self.map[60] == wk:
#                        #Whites castling on queens flank
#                        app.logger.info("Whites castling on queens flank")
#                        if (self.map[59] == z and self.map[58] == z and self.map[57] == z and self.map[56] == wr):
#                            app.logger.info("Whites castled")
#                            self.map[56] = z
#                            self.map[59] = wr
#                            self.white_castling_criteria = False
#                            return 1
#                        else:
#                            return -1
#                else:
#                    return -1
#            elif (self.map[move.get_from()] == bk):
#                #Blacks are trying to castle
#                app.logger.info("Blacks are trying to castle")
#                if self.black_castling_criteria:
#                    #Blacks have never moved king
#                    app.logger.info("Blacks have never moved king")
#                    if move.get_from() == 4 and move.get_to() == 6 and self.map[4] == bk:
#                        #Blacks castling on kings flank
#                        app.logger.info("Blacks castling on kings flank")
#                        if (self.map[5] == z and self.map[6] == z and self.map[7] == br):
#                            app.logger.info("Blacks castled")
#                            self.map[7] = z
#                            self.map[5] = br
#                            self.black_castling_criteria = False
#                            return 2
#                        else:
#                            return -2
#                    if move.get_from() == 4 and move.get_to() == 1 and self.map[4] == bk:
#                        #Blacks castling on queens flank
#                        app.logger.info("Blacks castling on queens flank")
#                        if (self.map[3] == z and self.map[2] == z and self.map[1] == z and self.map[0] == br):
#                            app.logger.info("Blacks castled")
#                            self.map[0] = z
#                            self.map[3] = br
#                            self.black_castling_criteria = False
#                            return 2
#                        else:
#                            return -2
#            else:
#                return 0
#
#    def check_piece(self, move):
#        if move.get_player()==self.white:
#            if self.turn == white_turn:
#                if self.map[move.get_from()] > z:
#                    return 1
#        elif move.get_player()==self.black:
#            if self.turn == black_turn:
#                if self.map[move.get_from()] < z:
#                    return 1
#        return 0
#
#
#CHECKS MOVEMENT INNUENDOS
#0 Move is invalid
#1 Move is valid
#2 Move is castling
#3 Move is white crown
#4 Move is black crown
#
#    def check_move(self, move):
#        if self.check_piece(move) == 0:
#            return 0
#        castling = self.check_castling(move)
#        if (castling == 1 or castling == 2):
#            return 2
#        if self.check_crown(move) == 1:
#            return 3
#        if self.check_crown(move) == 2:
#            return 4
#        return 1
