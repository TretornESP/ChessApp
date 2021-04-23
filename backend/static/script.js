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

  socket = io();

  socket.on('connect', function() {
    socket.emit('my_event', {match: code, player: player, data: "Connected"});
  });

  socket.on('disconnect', function() {
    socket.emit('my_event', {match: code, player: player, data: "Disconnected"});
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
    console.log(msg.turn + " " + msg.data + " " + msg.whites_timer + " " + msg.blacks_timerm + " " + msg.start_timer);
    if (msg.start_timer) {
      timer_active = true;
    }
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

    if ((seconds+minutes) <= 0) {
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
    $('.modal-header').append(
      "<button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"modal\" aria-label=\"Cerrar\"></button>"
    );
  }
  $('#just-a-modal').modal({ backdrop: 'static' });
  $('#just-a-modal').modal('show');
}

function attachButtons() {
  $("#report").click(function() {
    console.log("report clicked!");
    reportIllegal();
  });
  $("#call").click(function() {
    console.log("call clicked!");
  });
  $("#end").click(function() {
    console.log("end clicked!");
  });
  $("#tie").click(function() {
    console.log("tie clicked!");
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


function reportIllegal() {
  console.log('illegal reported');
  socket.emit('move', {data: "Illegal reported!"});
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

var timer = setInterval(function() {
  var seconds = parseInt($(".seconds").text(), 10);
  var minutes = parseInt($(".minutes").text(), 10);

  seconds--;

  if (minutes == 0 && seconds == 0) {
    clearInterval(timer);
    //Finish match
  } else {
    if (seconds <= 0) {minutes--; seconds = 60;}
    $(".minutes").text(minutes);
  }
  $(".seconds").text(seconds);

}, 1000)

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

    $(e.target).text($("#"+id).text());
    $("#"+id).text(z.key);

    if ($(e.target).hasClass(enemy_team)) {
      $(e.target).removeClass(enemy_team);
    } else if ($(e.target).hasClass(neutral_team)) {
      $(e.target).removeClass(neutral_team);
    }
    $(e.target).addClass(player_team);
    $("#"+id).removeClass(player_team);
    $("#"+id).addClass(neutral_team);

    console.log("UP: "+id);

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
