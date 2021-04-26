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
from model.accountant import Accountant
from model.request import Request, RequestType

def create_app():
    global server_config, socketio, manager, matcher, coder, accountant

    server_config = {}
    matcher = {}
    manager = DBManager()
    accountant = Accountant(manager)
    coder = ["white_team", "black_team", "admin_team", "viewer"]

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
        if match.is_admin(player):
            resp = make_response(render_template('admin.html'))
        elif match.is_viewer(player):
            resp = make_response(render_template('viewer.html'))
        else:
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

@app.route('/admin/view_events')
def get_events():
    evts = accountant.get_incidences_strings()
    app.logger.info("FOUND: " + str(len(evts)) + " INCIDENCES")
    return make_response(render_template('Theme/events.html', events=evts))

@app.route('/admin/view_matches')
def get_matches():
    mtch = accountant.get_matches_strings()
    app.logger.info("FOUND: " + str(len(mtch)) + " MATCHES")
    return make_response(render_template('Theme/viewmatches.html', matches=mtch))

@app.route("/admin")
def admin_pane():
    return make_response(render_template(
        'Theme/indexm.html',
        match_count=accountant.get_all_matches_count(),
        active_count=accountant.get_active_matches_count(),
        finished_count=accountant.get_finished_matches_count(),
        event_count=accountant.get_incidences_count(),
        error_count=accountant.get_errors_count()
    ))

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

@app.route('/admin/new/', methods=['GET', 'POST'])
def new():
    if request.method == 'GET':
        return make_response(render_template('Theme/form_component.html'))
    elif request.method == 'POST':
        app.logger.info("CREATING MATCH FOR W:"+request.json['white_name'] + " B:"+request.json['black_name'])
        match = Match(server_config, request.json['white_name'], request.json['black_name'])
        manager.add(match)
        return json.dumps(match.get_reduced_status())

@socketio.on('move')
def move_socket(message):
    match = manager.get_match(message['match'])
    if match.is_admin(message['player']):
        match.change_turn(match.color_at(message['from']))
        try:
            move = Move(message['player'], message['from'], message['to'], message['crown'])
        except KeyError:
            move = Move(message['player'], message['from'], message['to'])
        match.force_move(move)
        match.print_map()
        manager.update(match)
        app.logger.info("Admin moved "+ move.get_move().uci())
    elif match.valid_turn(message['player']):
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
            app.logger.info("RESPONSE WAS NONE: " + move.get_move().uci())
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
        match.finish_match()

    if match.match_end_time() != 0:
        if match.match_end_time() == 1:
            emit('ended', {'cause': 8, 'winner': False, 'result': "0-1"}, room=message['match'])
            match.finish_match()
        elif match.match_end_time() == 2:
            emit('ended', {'cause': 9, 'winner': True, 'result': "1-0"}, room=message['match'])
            match.finish_match()

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
            evt = Request(RequestType.ERROR, request.sid, "[DC] CODE NOT FOUND")
            match.push_event(evt)
            emit('new_event', evt.get_json(), room=accountant.get_cpanel())
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
        match.finish_match()

    elif match.match_end_time() == 2:
        print("INDEED BLACK OUT OF TIME")
        emit('ended', {'cause': 9, 'winner': True, 'result': "1-0"}, room=message['match'])
        match.finish_match()

    else:
        print("FALSE ALARM")
        emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('prev-play')
def prev_play(message):
    app.logger.info( message['match'] + " POP PLAY")
    match = manager.get_match(message['match'])
    response = match.pop()
    manager.update(match)
    emit('receive_movement', match.pack_data(), room=message['match'])
    return response

@socketio.on('reset-board')
def reset_board(message):
    app.logger.info( message['match'] + " RESET BOARD")
    match = manager.get_match(message['match'])
    match.reset_match()
    manager.update(match)
    emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('start-timer')
def start_time(message):
    app.logger.info( message['match'] + " START TIME" + str(message['code']))
    match = manager.get_match(message['match'])
    match.change_turn(message['code'])
    match.start_timer()
    manager.update(match)
    emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('pause-timer')
def pause_time(message):
    app.logger.info( message['match'] + " STOP TIME")
    match = manager.get_match(message['match'])
    match.stop_timer()
    manager.update(match)
    emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('set-turn')
def pause_time(message):
    app.logger.info( message['match'] + " CHANGE TURN: " + str(message['code']))
    match = manager.get_match(message['match'])
    match.change_turn(message['code'])
    manager.update(match)
    emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('set-time')
def set_time(message):
    app.logger.info( message['match'] + " SET TIME " + str(message['code']) + " TO: " + str(message['time']))
    match = manager.get_match(message['match'])
    match.set_time(message['code'], message['time'])
    manager.update(match)
    emit('receive_movement', match.pack_data(), room=message['match'])

@socketio.on('handshake_ack')
def handshake_ack(message):
    match = manager.get_match(message['match'])
    if match==None:
        app.logger.info("Tried to access to match: " + message['match'])
        return
    color = match.get_color(message['player'])
    code = match.join_match(message['player'], message['sid'])
    app.logger.info("[HANDSHAKE] ack received from " + message['sid'] + "C: " + color)

    if (code == 0 or code == 1 or code == 2 or code == 3):
        match = manager.get_match(message['match'])
        emit('chat', {'data': match.get_stack_as_string()}, room=request.sid)
        out = match.get_outcome()
        if out != None:
            emit('ended', {'cause': out.termination.value, 'winner': out.winner, 'result': out.result()}, room=request.sid)
            match.finish_match()
        leave_room(request.sid)
        join_room(message['match'])
        matcher[message['sid']] = {'code':message['match'], 'player':message['player']}

        emit('unlock', {'data': coder[code]}, room=message['match'])
        emit('receive_movement', match.pack_data(), room=message['match'])
        emit('chat', {'data': coder[code] + " CONNECTED"}, room=message['match'])
        manager.update(match)

        app.logger.info("PLAYER " + match.get_color(message['player']) + " JOINED OKAY")
    else:
        evt = Request(RequestType.ERROR, match.get_name_from_code(message['player']), "ERROR JOINING: INVALID PLAYER CODE")
        match.push_event(evt)
        emit('new_event', evt.get_json(), room=accountant.get_cpanel())
        app.logger.info("ERROR JOINING: INVALID PLAYER CODE")

@socketio.on('connect')
def connect():
    app.logger.info("[ON] " + request.sid + " requesting to connect")
    join_room(request.sid)
    emit('handshake', {'data': request.sid}, room=request.sid)
    app.logger.info("[HANDSHAKE] sent to "+request.sid)

@socketio.on('report_illegal')
def report(message):
    try:
        match = manager.get_match(message['match'])
        app.logger.info(message['match'] + " " + match.get_color(message['player']) + " REPORTED ILLEGAL")
        evt = Request(RequestType.ILLEGAL, match.get_name_from_code(message['player']))
        app.logger.info(evt.get())
        match.push_event(evt)
        emit('new_event', evt.get_json(), room=accountant.get_cpanel())
    except:
        traceback.print_exc()

@socketio.on('request_admin')
def admin(message):
    match = manager.get_match(message['match'])
    app.logger.info(message['match'] + " " + match.get_color(message['player']) + " REQUESTED ADMIN")
    evt = Request(RequestType.ADMIN, match.get_name_from_code(message['player']))
    match.push_event(evt)
    emit('new_event', evt.get_json(), room=accountant.get_cpanel())

@socketio.on('request_forfait')
def forfait(message):
    match = manager.get_match(message['match'])
    app.logger.info(message['match'] + " " + match.get_color(message['player']) + " REQUESTED FORFAIT")
@socketio.on('request_draw')
def draw(message):
    match = manager.get_match(message['match'])
    app.logger.info(message['match'] + " " + match.get_color(message['player']) + " REQUESTED DRAW")

@socketio.on('join_cpanel')
def join_cpanel():
    rc = accountant.new_cpanel()
    join_room(rc)
    emit('receive_cpanel_data', accountant.pack_data(), room=rc)

@socketio.on('request_cpanel_data')
def request_cpanel_data():
    emit('receive_cpanel_data', accountant.pack_data(), room=accountant.get_cpanel())

@socketio.on('search_matches')
def search_matches(message):
    app.logger.info("CUAK")
    found = []
    matches = manager.get_all_matches()
    cr = message['criteria']
    for obj in matches:
        match = manager.get_match(obj)
        if cr in match.get_white_name() or cr in match.get_black_name() or cr=="*":
            found.append(match.get_status())
    app.logger.info("Found: " + str(len(found)) + " matches with: " + cr)
    emit('search_matches_result', {'lenght':len(found), 'found':found}, room=accountant.get_cpanel())

@socketio.on('request_finished')
def request_finished():
    finished = accountant.get_finished_matches_strings()
    app.logger.info("Found: " + str(len(finished)) + " matches finished")
    emit('finished_provided', finished, room=accountant.get_cpanel())

@socketio.on('create-match')
def create_match(message):
    app.logger.info("TRYING TO CREATE A NEW MATCH")
    match = Match(server_config, message['whites'], message['blacks'])
    manager.add(match)
    emit('receive-new-match', match.get_reduced_status(), room=accountant.get_cpanel())
