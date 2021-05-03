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
var deltas = [];
var id;

$(document).ready(function(){
  $(".crowning :input").attr("disabled", true);

  set_players();
  generateBoard();
  attachButtons();
  window.addEventListener('beforeunload', function (e) {
      e.preventDefault();
      e.returnValue = '';
  });

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

  socket.on('stop_timer', function(msg, cb) {
    console.log("STOP THE TIMER!!!");
    timer_active = false;
  });

  socket.on('unlock', function(msg, cb) {
    console.log('Received unlock order for ' + msg.data);
    if (msg.data === player_team) {
      toggleLoading();
    }
     //if (cb)
     // cb();
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
      true
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

  socket.on('request_draw', function(msg, cb) {
    if ((msg.color==="white" && player_team==="white_team") || (msg.color==="black" && player_team==="black_team")) {
      var html = "<button type='button' class='btn-danger' data-bs-dismiss='modal' onclick='accept_draw()'>Aceptar</button>\
                 <button type='button' class='btn-secondary' data-bs-dismiss='modal' onclick='decline_draw()'>Rechazar</button>";
      showModal("El rival solicita tablas", html, false);
    }
  });

  socket.on('draw_declined', function(msg, cb) {
    if ((msg.color==="white" && player_team==="white_team") || (msg.color==="black" && player_team==="black_team")) {
      var html = "<button type='button' class='btn-danger' data-bs-dismiss='modal'>Aceptar</button>";
      showModal("El rival rechazó las tablas", html, false);
    }
  });

  socket.on('start_timer', function(msg, cb) {
    timer_active = true;
  });

  socket.on('receive_movement', function(msg, cb) {
    console.log(msg.turn + " " + msg.data + " " + msg.whites_timer + " " + msg.blacks_timerm + " " + msg.start_timer);

    timer_active = msg.start_timer;
    turn = msg.turn;
    //console.log('Received #' + msg.count + ': ' + msg.data);
    //console.log('----------------------');
    //console.log(board);
    var idx = 0;
    var last_board = [...board];
    board = [...empty_board];
    deltas = [];

    for (i = 0; i < msg.data.length; i++) {
      if (msg.data.charAt(i) === '/') {
        continue;
      } else if ($.isNumeric(msg.data.charAt(i))) {
        idx += parseInt(msg.data.charAt(i));
      } else {
  //      console.log("AT: " + idx + " " + translator[msg.data.charAt(i)]);
        if (last_board[idx] != translator[msg.data.charAt(i)]) {
          deltas.push(idx);
        }
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
        socket.emit('times_up', {sid: sid, match: code, player: player});
        m.text("0");
        s.text("0");
        timer_active = false;
      } else {
      seconds = 59;
      }
    }

    if (minutes < 10) {
      m.text("0"+minutes.toString());
    } else {
      m.text(minutes.toString());
    }

    if (seconds < 10 ) {
      s.text("0"+seconds.toString());
    } else {
      s.text(seconds.toString());
    }

  }, 1000);
});

var br = {code: "1", type: "rook", key: "&#9820", team: "black_team"};
var bh = {code: "2", type: "knight", key: "&#9822", team: "black_team"};
var bb = {code: "3", type: "bishop", key: "&#9821", team: "black_team"};
var bq = {code: "4", type: "queen", key: "&#9819", team: "black_team"};
var bk = {code: "5", type: "king", key: "&#9818", team: "black_team"};
var bp = {code: "6", type: "pawn", key: "&#9823", team: "black_team"};

var wr = {code: "8", type: "rook", key: "&#9814", team: "white_team"};
var wh = {code: "9", type: "knight", key: "&#9816", team: "white_team"};
var wb = {code: "10", type: "bishop", key: "&#9815", team: "white_team"};
var wq = {code: "11", type: "queen", key: "&#9813", team: "white_team"};
var wk = {code: "12", type: "king", key: "&#9812", team: "white_team"};
var wp = {code: "13", type: "pawn", key: "&#9817", team: "white_team"};

var z = {code: "14", type: "empty", key: "", team: "neutral"};
var ending_translator = ["invalid", "jaque mate", "ahogado",
                        "material insuficiente", "75 movimientos",
                        "quíntuple repetición", "50 movimientos",
                        "triple repetición", "blancas sin timepo",
                        "negras sin tiempo", "blancas se rinden",
                        "negras se rinden", "empate", "partida finalizada"];

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

function accept_draw() {
  socket.emit('accept_draw', {sid: sid, match: code, player: player});
}
function decline_draw() {
  socket.emit('decline_draw', {sid: sid, match: code, player: player});
}

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
}

function attachButtons() {
  $("#report").click(function() {
    console.log("report clicked!");
    timer_active = false;
    socket.emit('report_illegal', {sid: sid, match: code, player: player});
  });
  $("#call").click(function() {
    console.log("call clicked!");
    timer_active = false;
    socket.emit('request_admin', {sid: sid, match: code, player: player});
  });
  $("#end").click(function() {
    console.log("end clicked!");
    var html = "<button type='button' class='btn-danger' data-bs-dismiss='modal' onclick='forfait()'>Rendirse</button>\
               <button type='button' class='btn-secondary' data-bs-dismiss='modal'>Cancelar</button>";
    showModal("Rendirse", html, true);

  });
  $("#tie").click(function() {
    console.log("tie clicked!");
    var html = "<button type='button' class='btn-danger' data-bs-dismiss='modal' onclick='request_draw()'>Solicitar tablas</button>\
               <button type='button' class='btn-secondary' data-bs-dismiss='modal'>Cancelar</button>";
    showModal("Solicitar tablas", html, true);
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

function forfait() {
  socket.emit('request_forfait', {sid: sid, match: code, player: player});
}

function request_draw() {
  socket.emit('request_draw', {sid: sid, match: code, player: player});
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

function generateLimit(team) {
  if (team) {
    appendLimit("");
    for (i = 0; i < 8; i++) {
        appendLimit(String.fromCharCode(97+i));
    }
    appendLimit("");
  } else {
    appendLimit("");
    for (i = 7; i >= 0; i--) {
        appendLimit(String.fromCharCode(97+i));
    }
    appendLimit("");
  }
}

function generateBoard() {
  $( ".chessboard" ).empty();
  $( ".chessboard" ).css('width', $( ".chessboard" ).height());
  console.log("SIZE: " + $( ".chessboard" ).height());

  if (player_team === "white_team") {
    generateLimit(true);
    for (i = 0; i < 8; i++) {
      appendLimit(9-(i+1));
      for (j = 0; j < 8; j++) {
        if (deltas.includes(i*8+j)) {
          $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece last "+board[i*8+j].code+" "+board[i*8+j].team+" "+board[i*8+j].type+"\"></div>");
        } else {
          $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece "+color(i,j)+" "+board[i*8+j].code+" "+board[i*8+j].team+" "+board[i*8+j].type+"\"></div>");
        }
      }
      appendLimit(9-(i+1));
    }
    generateLimit(true);
  } else {
    generateLimit(false);
    for (i = 7; i >= 0; i--) {
      appendLimit(9-(i+1));
      for (j = 7; j >= 0; j--) {
        if (deltas.includes(i*8+j)) {
          $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece last "+board[i*8+j].code+" "+board[i*8+j].team+" "+board[i*8+j].type+"\"></div>");
        } else {
          $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece "+color(i,j)+" "+board[i*8+j].code+" "+board[i*8+j].team+" "+board[i*8+j].type+"\"></div>");
        }
      }
      appendLimit(9-(i+1));
    }
    generateLimit(false);
  }

  $(".audio")[0].play();
  $(".piece").mousedown(mouseDown);
  $(".piece").mouseup(mouseUp);
}

function mouseDown(e) {
    if (disable_board) return;
    $(".piece").mouseenter(function(e){
      $(e.target).css("background-color","green");
    });

    $(".piece").mouseleave(function(e){
      if ($(e.target).hasClass("white")) {
        $(e.target).css("background-color","#f0dab5");
      } else {
        $(e.target).css("background-color","#b58763");
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
  if (up.attr("id") === down.attr("id")) {
    console.log("Same slot!");
    return false;
  }
  if (!down.hasClass("piece") || !up.hasClass("piece")) {
    console.log("Out of board bounds!");
    return false;
  }
  if (down.hasClass("empty")) {
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

function set_players() {
  code = readCookie('match');
  player = readCookie('player');
  var color = readCookie('color');
  if (color === "white") {
    player_team = "white_team";
    player_number = 0;
    enemy_team = "black_team";
  } else if (color === "black") {
    player_team = "black_team";
    player_number = 1;
    enemy_team = "white_team";
  }

  console.log("Match started P:"+player_team+" E:"+enemy_team);
}

function mouseUp(e) {
  if (disable_board) return;

  var target = $(e.target).attr("id");
  var current = $("#"+id).attr("id");

  console.log("C: "+current+" T: "+target);
  if (legal($("#"+id), $(e.target))) {
    console.log("LLEGA");
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
  } else {
    console.log("frontend illegal");
  }

  $(".piece").off('mouseenter');

}

//You sneaky bitch
function translate(move) {
  return move-16*Math.floor(move/8)+56;
}

function toggleLoading(event){
  $(".loading").addClass('hidden');

/*  if ($(".loading").hasClass('hidden')){
    $(".loading").removeClass('hidden');
  } else {
    $(".loading").addClass('hidden');
  }*/
}
