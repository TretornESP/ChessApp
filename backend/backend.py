from flask import Flask, request, render_template, make_response, url_for
from flask_socketio import SocketIO, emit, join_room, leave_room

import yaml
import atexit
import time, threading, _thread
import json, os
import backlog
from enum import Enum
import traceback

from model.dbmanager import DBManager
from model.match import Match
from model.move import Move
from model.player import Player

def create_app():
    global server_config, socketio, manager, matcher, coder

    server_config = {}
    matcher = {}
    manager = DBManager()
    coder = ["white_team", "black_team"]

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
            socketio = SocketIO(app, ping_interval=server_config[server_config['active']]['ping_interval'], ping_timeout=server_config[server_config['active']]['ping_timeout'])
    except:
        print("ERROR LOADING CONFIG")
        traceback.print_exc()
        socketio = SocketIO(app)
    app.debug=True
    return app

app = create_app()



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
    match = manager.get_match(message['match'])
    if match.valid_turn(message['player']):
        if not match.timer_alive():
            if match.match_start():
                app.logger.info("MATCH "+ message['match'] +" STARTED!!!!")
            else:
                if not match.white_has_joined():
                    app.logger.info("WHITE HASNT JOINED")
                if not match.black_has_joined():
                    app.logger.info("BLACK HASNT JOINED")
                app.logger.info("WAITING FOR ONE PLAYER TO START THE MATCH")
                emit('receive_movement', match.pack_data(), room=message['match'])
                return
        try:
            move = Move(message['player'], message['from'], message['to'], message['crown'])
        except KeyError:
            move = Move(message['player'], message['from'], message['to'])
        response = match.make_move(move)
        manager.update(match)
        if response != None:
            emit('chat', {'data': response}, room=message['match'])
        else:
            app.logger.info("RESPONSE WAS NONE")
#        except:
#            app.logger.error("[MOVE] ERROR")
#            traceback.print_exc()
    else:
        app.logger.info("Bad turn!")
    emit('receive_movement', match.pack_data(), room=message['match'])
    out = match.get_outcome()
    if out != None:
        app.logger.info("[END] M: " + message['match'] + " C: " + str(out.termination) + " W: " +str(out.winner) + " R: " + out.result())
        emit('ended', {'cause': out.termination.value, 'winner': out.winner, 'result': out.result()}, room=message['match'])
    if match.match_end_time() != 0:
        if match.match_end_time() == 1:
            emit('ended', {'cause': 8, 'winner': False, 'result': "0-1"}, room=message['match'])
        elif match.match_end_time() == 2:
            emit('ended', {'cause': 9, 'winner': True, 'result': "1-0"}, room=message['match'])

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
            leave_room(match_code['code'])
            emit('chat', {'data': match.get_color(match_code['player']) + " DISCONNECTED"}, room=match_code['code'])
            app.logger.info("[DC] " + match.get_color(match_code['player']) + " " +  request.sid + " disconnected ok")
            manager.update(match)
        else:
            app.logger.error("[DC] CODE NOT FOUND")
    except:
        app.logger.error("[DC] ERROR")
        traceback.print_exc()

@socketio.on('times_up')
def time_up(message):
    match = manager.get_match(message['match'])
    app.logger.info(message['match'] + " " + match.get_color(message['player']) + " TIME UP!")

    if match.match_end_time() == 1:
        print("INDEED WHITE OUT OF TIME")
        emit('ended', {'cause': 8, 'winner': False, 'result': "0-1"}, room=message['match'])
    elif match.match_end_time() == 2:
        print("INDEED BLACK OUT OF TIME")
        emit('ended', {'cause': 9, 'winner': True, 'result': "1-0"}, room=message['match'])
    else:
        print("FALSE ALARM")
        emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('handshake_ack')
def handshake_ack(message):
    match = manager.get_match(message['match'])
    color = match.get_color(message['player'])
    code = match.join_match(message['player'], message['sid'])
    app.logger.info("[HANDSHAKE] ack received from " + message['sid'] + "C: " + color)

    if (code == 0 or code == 1):
        match = manager.get_match(message['match'])
        emit('chat', {'data': match.get_stack_as_string()}, room=request.sid)
        out = match.get_outcome()
        if out != None:
            emit('ended', {'cause': out.termination.value, 'winner': out.winner, 'result': out.result()}, room=request.sid)
        leave_room(request.sid)
        join_room(message['match'])
        matcher[message['sid']] = {'code':message['match'], 'player':message['player']}

        emit('unlock', {'data': coder[code]}, room=message['match'])
        emit('receive_movement', match.pack_data(), room=message['match'])
        emit('chat', {'data': coder[code] + " CONNECTED"}, room=message['match'])
        manager.update(match)

        app.logger.info("PLAYER " + match.get_color(message['player']) + " JOINED OKAY")

    else:
        app.logger.info("ERROR JOINING: INVALID PLAYER CODE")

@socketio.on('connect')
def connect():
    app.logger.info("[ON] " + request.sid + " requesting to connect")
    join_room(request.sid)
    emit('handshake', {'data': request.sid}, room=request.sid)
    app.logger.info("[HANDSHAKE] sent to "+request.sid)
