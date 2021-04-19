from flask import Flask, request, render_template, make_response, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room

import yaml
import atexit
import time, threading, _thread
import uuid, json, os
import backlog
from enum import Enum
from sqlitedict import SqliteDict
import traceback

def create_app():
    app = Flask(__name__, template_folder='templates')
    print("WELCOME TO THE CHESS SERVER")
    try:
        with open(r'config.yml') as file:
            server_config = yaml.load(file, Loader=yaml.FullLoader)
            print("SERVER CONFIG:")
            print("ACTIVE:   " + server_config['active'])
            print("HOST:     " + server_config[server_config['active']]['host'])
            print("INTERVAL: " + str(server_config[server_config['active']]['ping_interval']))
            print("TIMEOUT:  " + str(server_config[server_config['active']]['ping_timeout']))
    except:
        print("ERROR LOADING CONFIG")
        traceback.print_exc()
    return app

server_config = {'active': 'local', 'local': {'host':'http://localhost:5000', 'ping_interval': 1, 'ping_timeout': 1}}
app = create_app()
socketio = SocketIO(app, engineio_logger=True, ping_interval=server_config[server_config['active']]['ping_interval'], ping_timeout=server_config[server_config['active']]['ping_timeout'])
matcher = {}
coder = ["white_team", "black_team"]
white_crowner = {
    "crown_rook": 8,
    "crown_horse": 9,
    "crown_bishop": 10,
    "crown_queen": 11
}
black_crowner = {
    "crown_rook": 1,
    "crown_horse": 2,
    "crown_bishop": 3,
    "crown_queen": 4
}
white_turn = 0
black_turn = 1
br =  1
bh =  2
bb =  3
bq =  4
bk =  5
bp =  6
z =  7
wr =  8
wh =  9
wb = 10
wq = 11
wk = 12
wp = 13

translator =  [
    {'key': "&#9820", 'team': "black_team", 'clue': 'br'},
    {'key': "&#9822", 'team': "black_team", 'clue': 'bh'},
    {'key': "&#9821", 'team': "black_team", 'clue': 'bb'},
    {'key': "&#9819", 'team': "black_team", 'clue': 'bq'},
    {'key': "&#9818", 'team': "black_team", 'clue': 'bk'},
    {'key': "&#9823", 'team': "black_team", 'clue': 'bp'},
    {'key': "&#9814", 'team': "white_team", 'clue': 'wr'},
    {'key': "&#9816", 'team': "white_team", 'clue': 'wh'},
    {'key': "&#9815", 'team': "white_team", 'clue': 'wb'},
    {'key': "&#9813", 'team': "white_team", 'clue': 'wq'},
    {'key': "&#9812", 'team': "white_team", 'clue': 'wk'},
    {'key': "&#9817", 'team': "white_team", 'clue': 'wp'},
    {'key': "", 'team': "neutral"}
]

class Move():
    def __init__(self, p, f, t):
        self.p = p
        self.f = int(f)
        self.t = int(t)
    def get_player(self):
        return self.p
    def get_from(self):
        return self.f
    def get_to(self):
        return self.t
    def set_crown(self, crown):
        self.c = crown
    def get_crown(self):
        return self.c
    def invalid_move(self):
        return "invalid movement"

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

manager = DBManager()

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

class Match():
    def __init__(self):
        self.code = str(uuid.uuid4())
        self.white = str(uuid.uuid4())[:8]
        self.black = str(uuid.uuid4())[:8]
        self.white_joined = False
        self.black_joined = False
        self.white_sid = None
        self.black_sid = None
        self.white_castling_criteria = True
        self.black_castling_criteria = True
        self.turn = white_turn
        self.init_board()
    def get_white_sid(self):
        return self.white_sid
    def get_black_sid(self):
        return self.black_sid
    def get_color(self, player):
        if player == self.black:
            return "black"
        else:
            return "white"


    #return codes:
    #SUCCESS: 0 white joined,          1 black joined
    #ERROR:  -1 White already joined, -2 Black Already Joined
    #        -3 Invalid player code
    def join_match(self, player, sid):
        if player == self.white:
            if self.white_joined == False:
                self.white_sid = sid
                self.white_joined = True
                return 0
            else:
                return -1
        elif player == self.black:
            if self.black_joined == False:
                self.black_sid = sid
                self.black_joined = True
                return 1
            else:
                return -2
        return -3

    #return codes:
    #SUCCESS: 0 Black left, 1 White left
    #ERROR:  -1 Invalid player code
    def leave_match(self, player):
        if player == self.white:
            self.white_sid = None
            self.white_joined = False
            return 0
        elif player == self.black:
            self.black_sid = None
            self.black_joined = False
            return 1
        return -1

    def init_board(self):
        self.map = [
          br, bh, bb, bq, bk, bb, bh, br,
          bp, bp, bp, bp, bp, bp, bp, bp,
          z,z,z,z,z,z,z,z,
          z,z,z,z,z,z,z,z,
          z,z,z,z,z,z,z,z,
          z,z,z,z,z,z,z,z,
          wp, wp, wp, wp, wp, wp, wp, wp,
          wr, wh, wb, wq, wk, wb, wh, wr
        ]

#CHECKS IF ANYONE CAN CROWN
#RETURN 0 No one crowns, 1 White can crown, 2 Black can crown
    def check_crown(self, move):
        if self.map[move.get_from()] == wp:
            if 0 <= move.get_to() <= 7:
                return 1
            return 0
        if self.map[move.get_from()] == bp:
            if 56 <= move.get_to() <= 63:
                return 2
            return 0
        return 0

#CHECKS IF SOMEONE IS CASTLING AND IF IT IS VALID
#WE ONLY CHECK FOR THE PIECES BEING IN PLACE, NOT FOR PREVIOUS MOVES NOR KING CHECKS
#RETURN: SUCCESS: 0 No one castles, 1 Whites are and can castle, 2 Blacks are and can castle
#        ERROR:  -1 Whites are castling but cannot, -2 Blacks are castling but cannot
#
    def check_castling(self, move):
        if (abs(move.get_from() - move.get_to()) == 2):
            if (self.map[move.get_from()] == wk):
                #Whites are trying to castle
                app.logger.info("Whites are trying to castle")
                if self.white_castling_criteria:
                    #Whites have never moved king
                    app.logger.info("Whites have never moved king")
                    if move.get_from() == 60 and move.get_to() == 62 and self.map[60] == wk:
                        #Whites castling on kings flank
                        app.logger.info("Whites castling on kings flank")
                        if (self.map[62] == z and self.map[61] == z and self.map[63] == wr):
                            app.logger.info("Whites castled")
                            self.map[63] = z
                            self.map[61] = wr
                            self.white_castling_criteria = False
                            return 1
                        else:
                            return -1
                    if move.get_from() == 60 and move.get_to() == 58 and self.map[60] == wk:
                        #Whites castling on queens flank
                        app.logger.info("Whites castling on queens flank")
                        if (self.map[59] == z and self.map[58] == z and self.map[57] == z and self.map[56] == wr):
                            app.logger.info("Whites castled")
                            self.map[56] = z
                            self.map[59] = wr
                            self.white_castling_criteria = False
                            return 1
                        else:
                            return -1
                else:
                    return -1
            elif (self.map[move.get_from()] == bk):
                #Blacks are trying to castle
                app.logger.info("Blacks are trying to castle")
                if self.black_castling_criteria:
                    #Blacks have never moved king
                    app.logger.info("Blacks have never moved king")
                    if move.get_from() == 4 and move.get_to() == 6 and self.map[4] == bk:
                        #Blacks castling on kings flank
                        app.logger.info("Blacks castling on kings flank")
                        if (self.map[5] == z and self.map[6] == z and self.map[7] == br):
                            app.logger.info("Blacks castled")
                            self.map[7] = z
                            self.map[5] = br
                            self.black_castling_criteria = False
                            return 2
                        else:
                            return -2
                    if move.get_from() == 4 and move.get_to() == 1 and self.map[4] == bk:
                        #Blacks castling on queens flank
                        app.logger.info("Blacks castling on queens flank")
                        if (self.map[3] == z and self.map[2] == z and self.map[1] == z and self.map[0] == br):
                            app.logger.info("Blacks castled")
                            self.map[0] = z
                            self.map[3] = br
                            self.black_castling_criteria = False
                            return 2
                        else:
                            return -2
            else:
                return 0

    def check_piece(self, move):
        if move.get_player()==self.white:
            if self.turn == white_turn:
                if self.map[move.get_from()] > z:
                    return 1
        elif move.get_player()==self.black:
            if self.turn == black_turn:
                if self.map[move.get_from()] < z:
                    return 1
        return 0


#CHECKS MOVEMENT INNUENDOS
#0 Move is invalid
#1 Move is valid
#2 Move is castling
#3 Move is white crown
#4 Move is black crown

    def check_move(self, move):
        if self.check_piece(move) == 0:
            return 0
        castling = self.check_castling(move)
        if (castling == 1 or castling == 2):
            return 2
        if self.check_crown(move) == 1:
            return 3
        if self.check_crown(move) == 2:
            return 4
        return 1

    def get_code(self):
        return self.code
    def get_white(self):
        return self.white
    def get_black(self):
        return self.black
    def make_move(self, move):
        code = self.check_move(move)
        if code > 0:
            app.logger.info('['+str(self.code)+'] ' + str(self.turn) + ' moving C:' + str(code))
            if code == 3:
                self.map[move.get_to()] = white_crowner[move.get_crown()]
            elif code == 4:
                self.map[move.get_to()] = black_crowner[move.get_crown()]
            else:
                self.map[move.get_to()] = self.map[move.get_from()]
            self.map[move.get_from()] = z
            self.turn = (1 - self.turn)
            return code
        else:
            app.logger.info('invalid movement, code: ' + str(code))
            return move.invalid_move()
    def get_map(self):
        return self.map
    def get_turn(self):
        return self.turn;
    def as_json(self):
        return {"code": self.code, "white": self.white, "black": self.black, "turn":self.turn, "map":self.map}

@app.route('/match/<code>/join/<player>')
def join_match(code, player):
    try:
        match = manager.get_match(code)
        resp = make_response(render_template('board.html'))
        resp.set_cookie('match', code)
        resp.set_cookie('player', player)
        resp.set_cookie('color', match.get_color(player))
        manager.update(match)
    except KeyError:
        resp = render_template('expired.html')
    finally:
        return resp

@app.route('/match/<code>/')
def get_board(code):
    try:
        match = manager.get_match(code)
        return json.dumps(match.get_map())
    except KeyError:
        return "unknown"


#@app.route('/match/<code>/move/')
#def move(code):
#    move = Move(request.args.get('player'), request.args.get('from'), request.args.get('to'))
#    match = manager.get_match(code)
#    response = match.make_move(move)
#    manager.update(match)
#    return response

@app.route('/admin/match/<code>')
def see_match(code):
    return json.dumps(manager.get_match(code).as_json())

@app.route('/admin/matches/')
def get_all_matches():
    return json.dumps(manager.get_all_matches())

@app.route('/admin/matches/removeall')
def remove_all():
    manager.empty()
    return "ok"

@app.route('/admin/new/')
def new():
    match = Match()
    manager.add(match)
    white_link = server_config[server_config['active']]['host'] +"/match/"+match.get_code()+"/join/"+match.get_white()
    black_link = server_config[server_config['active']]['host'] +"/match/"+match.get_code()+"/join/"+match.get_black()
    return json.dumps({"code": match.get_code(), "white": white_link, "black": black_link})

@socketio.on('move')
def move_socket(message):
    move = Move(message['player'], message['from'], message['to'])
    try:
        move.set_crown(message['crown'])
    except KeyError:
        pass
    match = manager.get_match(message['match'])
    response = match.make_move(move)
    manager.update(match)
    emit('receive_movement', {'turn':match.get_turn(), 'data':match.get_map()}, room=message['match'])

@socketio.on('my_event')
def test_message(message):
    emit('my_response', {'data': message['data'].upper()})

@socketio.on('disconnect')
def disconnect():
    try:
        app.logger.info("[DC] " + request.sid + " requesting disconnect")
        match_code = matcher[request.sid]
        match = manager.get_match(match_code['code'])
        code = match.leave_match(match_code['player'])
        if (code == 0 or code == 1):
            leave_room(match)
            emit('chat', {'data': match.get_color(match_code['player']) + " DISCONNECTED"}, room=match)
            app.logger.info("[DC] " + request.sid + " disconnected ok")
        else:
            app.logger.error("[DC] CODE NOT FOUND")
    except:
        app.logger.error("[DC] ERROR")
        traceback.print_exc()

@socketio.on('handshake_ack')
def handshake_ack(message):
    app.logger.info("[HANDSHAKE] ack received from " + message['sid'])
    match = manager.get_match(message['match'])
    code = match.join_match(message['player'], message['sid'])
    if (code == 0 or code == 1):
        leave_room(request.sid)
        join_room(message['match'])
        matcher[message['sid']] = {'code':message['match'], 'player':message['player']}
        emit('unlock', {'data': coder[code]}, room=message['match'])
        emit('receive_movement', {'turn':match.get_turn(), 'data':match.get_map()}, room=message['match'])
        emit('chat', {'data': coder[code] + " CONNECTED"}, room=message['match'])
@socketio.on('connect')
def connect():
    app.logger.info("[ON] " + request.sid + " requesting to connect")
    join_room(request.sid)
    emit('handshake', {'data': request.sid}, room=request.sid)
    app.logger.info("[HANDSHAKE] sent to "+request.sid)


#@socketio.on('update_me')
#def keep_alive(message):
#    #print(message['sid'] + " SENT KEEPALIVE")
#    match = manager.get_match(message['match'])
#    emit('receive_movement', {'data': match.get_map(), 'turn': match.get_turn(), 'time': (time.time() * 1000)}, room=message['sid'])
