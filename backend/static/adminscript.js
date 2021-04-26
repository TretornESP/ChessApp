//MODIFY THIS GIVEN THE CHESSBOARD SIZE, DEFAULT 800px
var PIECE_SIZE_OFFSET = 30;

var dirty;
var socket;
var sid;
var enemy_team;
var player_team;
var player_number;
var neutral_team = "neutral";
var code;
var player;
var turn;
var disable_board = false;
var crown = "none"
var timer_active = false;
var timeout;
var speed = 500;

var time_modal = '\
<div class="time-edit clock-edit">\
  <span class="edit-minutes">4</span>\
  <span class="edit-blinking">:</span>\
  <span class="edit-seconds">30</span>\
  <div class="modal-buttons">\
    <button id="more-time" type="button" class="btn btn-secondary">+</button>\
    <button id="less-time" type="button" class="btn btn-secondary">-</button>\
    <button id="save-%-time" type="button" data-bs-dismiss="modal" class="btn btn-secondary">Guardar</button>\
  </div>\
</div>';

$(document).ready(function(){
  $(".crowning :input").attr("disabled", true);

  set_players();
  generateBoard();
  attachButtons();
  $(".loading").addClass('hidden');

  $( window ).resize(function() {
    generateBoard();
  });

  console.log("URL: " + window.location.host);
  socket = io(window.location.host);

  socket.on('connect', function() {
    socket.emit('my_event', {match: code, player: player, data: "Connected"});
  });

  socket.on('disconnect', function() {
    socket.emit('my_event', {match: code, player: player, data: "Disconnected"});
  });

  socket.on('my_response', function(msg, cb) {
    console.log('Received #' + msg.count + ': ' + msg.data);
    if (msg.lock === 'no') {
      toggleLoading();
    }
     //if (cb)
     // cb();
  });

  socket.on('ended', function(msg, cb) {
    console.log('Match finished C:' + msg.cause + ' W: ' + msg.winner + ' R: ' + msg.result);
    showModal(
      "Partida finalizada: " + msg.result,
      "<span>"+ending_translator[msg.cause]+"</span>",
      false
    );
  });

  socket.on('handshake', function (msg, cb) {
    console.log('Handshake received: '+msg.data);
    sid = msg.data;
    socket.emit('handshake_ack', {sid: msg.data, match: code, player: player});
    $(".log_view").val("");
  });

  socket.on('chat', function (msg, cb) {
    console.log("CHAT RECEIVED");
    $(".log_view").val($(".log_view").val() + msg.data + ", ");
  });

  socket.on('start_timer', function(msg, cb) {
    timer_active = true;
  });

  socket.on('receive_movement', function(msg, cb) {
    console.log(msg.turn + " " + msg.data + " " + msg.whites_timer + " " + msg.blacks_timer + " " + msg.start_timer);
    timer_active = msg.start_timer;

    turn = msg.turn;
    //console.log('Received #' + msg.count + ': ' + msg.data);
    //console.log('----------------------');
    //console.log(board);
    var idx = 0;

    board = [...empty_board];

    for (i = 0; i < msg.data.length; i++) {
      if (msg.data.charAt(i) === '/') {
        continue;
      } else if ($.isNumeric(msg.data.charAt(i))) {
        idx += parseInt(msg.data.charAt(i));
      } else {
  //      console.log("AT: " + idx + " " + translator[msg.data.charAt(i)]);
        board[idx++] = translator[msg.data.charAt(i)];
      }
    }
    generateBoard();
    showTime(msg.whites_timer, msg.blacks_timer);
  });

  setInterval(() => {
    if (!timer_active) return;
    var m, s, minutes, seconds;

    if (turn) {
      m = $(".whites-minutes");
      s = $(".whites-seconds");
    } else {
      m = $(".blacks-minutes");
      s = $(".blacks-seconds");
    }

    minutes = parseInt(m.text());
    seconds = parseInt(s.text());

    seconds--;

    if (minutes < 0) {
      console.log("TIMES UP!!");
      socket.emit('times_up', {sid: sid, match: code, player: player});
    }

    if (seconds <= 0) {
      minutes--;
      if (minutes <= 0) {
        console.log("TIMES UP!!");
      //  socket.emit('times_up', {sid: sid, match: code, player: player});
        m.text("0");
        s.text("0");
        timer_active = false;
      } else {
      seconds = 59;
      }
    }


    m.text(minutes.toString());
    s.text(seconds.toString());

  }, 1000);
});

var br = {code: "1", key: "&#9820", team: "black_team"};
var bh = {code: "2", key: "&#9822", team: "black_team"};
var bb = {code: "3", key: "&#9821", team: "black_team"};
var bq = {code: "4", key: "&#9819", team: "black_team"};
var bk = {code: "5", key: "&#9818", team: "black_team"};
var bp = {code: "6", key: "&#9823", team: "black_team"};

var wr = {code: "8", key: "&#9814", team: "white_team"};
var wh = {code: "9", key: "&#9816", team: "white_team"};
var wb = {code: "10", key: "&#9815", team: "white_team"};
var wq = {code: "11", key: "&#9813", team: "white_team"};
var wk = {code: "12", key: "&#9812", team: "white_team"};
var wp = {code: "13", key: "&#9817", team: "white_team"};

var z = {code: "14", key: "", team: "neutral"};
var ending_translator = ["invalid", "jaque mate", "ahogado", "material insuficiente", "75 movimientos", "quíntuple repetición", "50 movimientos", "triple repetición", "blancas sin timepo", "negras sin tiempo"];
var crown_translator = {"crown_rook":4, "crown_horse":2, "crown_bishop":3, "crown_queen":5};
var translator = {"r":br, "n":bh, "b":bb, "q":bq, "k":bk, "p":bp, "R":wr, "N":wh, "B":wb, "Q":wq, "K":wk, "P":wp}
//var translator = [br, bh, bb, bq, bk, bp, z, wr, wh, wb, wq, wk, wp];

var empty_board = [
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z,
  z, z, z, z, z, z, z, z
];

var board = [
  br, bh, bb, bq, bk, bb, bh, br,
  bp, bp, bp, bp, bp, bp, bp, bp,
  z,z,z,z,z,z,z,z,
  z,z,z,z,z,z,z,z,
  z,z,z,z,z,z,z,z,
  z,z,z,z,z,z,z,z,
  wp, wp, wp, wp, wp, wp, wp, wp,
  wr, wh, wb, wq, wk, wb, wh, wr
];

function showTime(white, black) {
  var wminutes = Math.floor(white / 60);
  var wseconds = white - wminutes * 60;
  var bminutes = Math.floor(black / 60);
  var bseconds = black - bminutes * 60;

  $(".whites-minutes").text(wminutes);
  $(".whites-seconds").text(wseconds);
  $(".blacks-minutes").text(bminutes);
  $(".blacks-seconds").text(bseconds);
}

function showModal(title, body, cancellable) {
  $('.modal-title').text(title);
  $('.modal-body').html(body);
  if (cancellable) {
    $('.modal-closing-buttons').html(
      "<button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Cerrar\"></button>"
    );
  }
  $('#just-a-modal').modal({ backdrop: 'static' });
  $('#just-a-modal').modal('show');
  attachModalButtons();
}

function moreTime(speed) {
  var m = $(".edit-minutes");
  var s = $(".edit-seconds");

  var mt = parseInt(m.text());
  var st = parseInt(s.text());

  st++;

  if (st >= 60) {
    mt++;
    st = 0;
  }

  m.text(mt);
  s.text(st);
  timeout = setTimeout(() => {
    moreTime(Math.max(25, speed * 0.8));
  }, speed);
}

function lessTime(speed) {
  var m = $(".edit-minutes");
  var s = $(".edit-seconds");

  var mt = parseInt(m.text());
  var st = parseInt(s.text());

  st--;

  if (st < 0) {
    mt--;
    st = 59;
  }

  m.text(mt);
  s.text(st);

  timeout = setTimeout(() => {
    lessTime(Math.max(25, speed * 0.8));
  }, speed);
}

function stop() {
  clearTimeout(timeout);
}

function attachModalButtons() {
  $('#more-time').on('mousedown mouseup mouseleave', e => {
    if (e.type == "mousedown") {
      moreTime(speed);
    } else {
      stop()
    }
  });

  $('#less-time').on('mousedown mouseup mouseleave', e => {
    if (e.type == "mousedown") {
      lessTime(speed);
    } else {
      stop()
    }
  });
  $("#save-whites-time").click(function() {
    var m = $(".edit-minutes").text();
    var s = $(".edit-seconds").text();
    socket.emit('set-time', {sid: sid, match: code, player: player, code: true, time: parseInt(m)*60+parseInt(s)});
  });
  $("#save-blacks-time").click(function() {
    var m = $(".edit-minutes").text();
    var s = $(".edit-seconds").text();
    socket.emit('set-time', {sid: sid, match: code, player: player, code: false, time: parseInt(m)*60+parseInt(s)});
  });
}

function attachButtons() {

  $("#prev-play").click(function() {
    console.log("prev play clicked!");
    socket.emit('prev-play', {sid: sid, match: code, player: player});
  });
  $("#next-play").click(function() {
    console.log("next play clicked!");
    socket.emit('next-play', {sid: sid, match: code, player: player});
  });
  $("#pause-time").click(function() {
    console.log("pausing time clicked!");
    socket.emit('pause-timer', {sid: sid, match: code, player: player});
  });
  $("#start-blacks-time").click(function() {
    console.log("starting time clicked!");
    socket.emit('start-timer', {sid: sid, match: code, player: player, code: false});
  });
  $("#reset-board").click(function() {
    console.log("reset board clicked!");
    socket.emit('reset-board', {sid: sid, match: code, player: player});
  });
  $("#start-whites-time").click(function() {
    console.log("starting time clicked!");
    socket.emit('start-timer', {sid: sid, match: code, player: player, code: true});
  });
  $("#set-white-turn").click(function() {
    console.log("white turn set!");
    socket.emit('set-turn', {sid: sid, match: code, player: player, code: true});
  });
  $("#set-black-turn").click(function() {
    console.log("black turn set!");
    socket.emit('set-turn', {sid: sid, match: code, player: player, code: false});
  });
  $("#edit-whites-time").click(function() {
    showModal(
      "Tiempo blancas",
      time_modal.replace("%", "whites"),
      true
    );
  });
  $("#edit-blacks-time").click(function() {
    showModal(
      "Tiempo negras",
      time_modal.replace("%", "blacks"),
      true
    );
  });
  $(".crown_btn").click(function crown() {
      console.log("CROWN ID: " + crown_translator[this.id]);
      socket.emit('move', {sid: sid, match: code, player: player, from: translate(crown_from), to: translate(crown_to), crown: crown_translator[this.id]});

      $(".crowning :input").attr("disabled", true);
      $(".crowning :input").removeClass("blinking");
      disable_board = false;
  });
  $("#extra").click(function extra() {
    console.log("CLIK");
    $('#just-a-modal').modal({ backdrop: 'static' });
    $('#just-a-modal').modal('show');
  });
}

function color(x, y) {
  if (((x+y) % 2) == 0) {
    return "white";
  } else {
    return "black";
  }
}

function appendLimit(input) {
  $( ".chessboard" ).append("<div class =\"limit\">"+input+"</div>");
}

function generateLimit() {
  appendLimit("");
  for (i = 0; i < 8; i++) {
      appendLimit(String.fromCharCode(97+i));
  }
  appendLimit("");
}

function generateBoard() {
  $( ".chessboard" ).empty();
  $( ".chessboard" ).css('width', $( ".chessboard" ).height());
  console.log("SIZE: " + $( ".chessboard" ).height());
  generateLimit();

  for (i = 0; i < 8; i++) {
    appendLimit(9-(i+1));
    for (j = 0; j < 8; j++) {
      $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece "+color(i,j)+" "+board[i*8+j].code+"\">"+board[i*8+j].key+"</div>");
    }
    appendLimit(9-(i+1));
  }
  generateLimit();


  $(".piece").mousedown(mouseDown);
  $(".piece").mouseup(mouseUp);
  var volume = parseInt($(".chessboard").height());
  $(".black, .white, .limit").css('font-size', Math.ceil(volume/10)-PIECE_SIZE_OFFSET + "px");
}
var id;

function mouseDown(e) {
    if (disable_board) return;
    $(".piece").mouseenter(function(e){
      $(e.target).css("background-color","green");
    });

    $(".piece").mouseleave(function(e){
      if ($(e.target).hasClass("white")) {
        $(e.target).css("background-color","#fff");
      } else {
        $(e.target).css("background-color","966F33");
      }
    });

    id = $(e.target).attr("id");
    console.log("DOWN: "+id);
}


function checkCrown(down, up) {
  if (down.hasClass(wp.code)) {
    if (up.attr("id") >= 0  && up.attr("id") <= 7) {
      return true;
    }
    return false;
  }
  if (down.hasClass(bp.code)) {
    if (up.attr("id") >= 56  && up.attr("id") <= 63) {
      return true;
    }
    return false;
  }
}

function legal(down, up) {
  console.log("DOWN: " + down.text() + " UP: " + up.text());
  if (up.attr("id") === down.attr("id")) {
    console.log("Same slot!");
    return false;
  }
  if (!down.hasClass("piece") || !up.hasClass("piece")) {
    console.log("Out of board bounds!");
    return false;
  }
  if (down.text() === "") {
    console.log("Selected empty!");
    return false;
  }
  //CAMBIAME
  /*
  if (up.hasClass(player_team)) {
    console.log("Over an ally!");
    return false;
  }
  if (down.hasClass(enemy_team)) {
    console.log("Moving an enemy");
    return false;
  }
  */
  return true;
}

function linear_to_coords(linear) {
  var row = Math.floor(linear / 8);
  var col = String.fromCharCode(65+(linear % 8));
  return col+row;
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

//function generate_move_url(code) {
//  return window.location.protocol + "//" + window.location.host + "/match/" + code + "/move";
//}

function legal(down, up) {
  console.log("DOWN: " + down.text() + " UP: " + up.text());
  if (up.attr("id") === down.attr("id")) {
    console.log("Same slot!");
    return false;
  }
  if (!down.hasClass("piece") || !up.hasClass("piece")) {
    console.log("Out of board bounds!");
    return false;
  }
  if (down.text() === "") {
    console.log("Selected empty!");
    return false;
  }
  //CAMBIAME
  /*
  if (up.hasClass(player_team)) {
    console.log("Over an ally!");
    return false;
  }
  if (down.hasClass(enemy_team)) {
    console.log("Moving an enemy");
    return false;
  }
  */
  return true;
}

function set_players() {
  code = readCookie('match');
  player = readCookie('player');
  var color = readCookie('color');
  player_team = "admin_team";
}

function mouseUp(e) {
  if (disable_board) return;

  var target = $(e.target).attr("id");
  var current = $("#"+id).attr("id");
  if (legal($("#"+id), $(e.target))) {
    if (checkCrown($("#"+id), $(e.target))) {
      console.log("CROWN DETECTED");
      $(".crowning :input").attr("disabled", false);
      $(".crowning :input").addClass("blinking");
      disable_board = true;
      crown_from = current;
      crown_to = target;
    } else {
      socket.emit('move', {sid: sid, match: code, player: player, from: translate(current), to: translate(target)});
    }
  }

  $(".piece").off('mouseenter');

}

//You sneaky bitch
function translate(move) {
  return move-16*Math.floor(move/8)+56;
}
