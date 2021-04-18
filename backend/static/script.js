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

$(document).ready(function(){
  $(".crowning :input").attr("disabled", true);

  set_players();
  generateBoard();
  attachButtons();
  window.addEventListener('beforeunload', function (e) {
      e.preventDefault();
      e.returnValue = '';
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

  socket.on('handshake', function (msg, cb) {
    console.log('Handshake received: '+msg.data);
    sid = msg.data;
    socket.emit('handshake_ack', {sid: msg.data, match: code, player: player});
  });

  socket.on('receive_movement', function(msg, cb) {
    turn = msg.turn;
    //console.log('Received #' + msg.count + ': ' + msg.data);
    //console.log('----------------------');
    //console.log(board);
    for (i = 0; i < 64; i++) {
      board[i] = translator[msg.data[i]-1];
    }
    //console.log('----------------------');
    //console.log(board);
    generateBoard();
  });

/*  setInterval(() => {
    if (nasty > 0) {
      nasty--;
    } else {
      socket.emit('update_me', {sid: sid, match: code, player: player});
    }
  }, 32); //THIS CAN CAUSE A DOS!!! IMPLEMENT DoS PROTECTION ON BACKEND */
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

var translator = [br, bh, bb, bq, bk, bp, z, wr, wh, wb, wq, wk, wp];

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
      socket.emit('move', {sid: sid, match: code, player: player, from: crown_from, to: crown_to, crown: this.id});

      $(".crowning :input").attr("disabled", true);
      $(".crowning :input").removeClass("blinking");
      disable_board = false;
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
      appendLimit(String.fromCharCode(65+i));
  }
  appendLimit("");
}

function generateBoard() {
  $( ".chessboard" ).empty();
  generateLimit();
  for (i = 0; i < 8; i++) {
    appendLimit(i);
    for (j = 0; j < 8; j++) {
      $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece "+color(i,j)+" "+board[i*8+j].team+" "+board[i*8+j].code+"\">"+board[i*8+j].key+"</div>");
    }
    appendLimit(i);
  }
  generateLimit();

  $(".piece").mousedown(mouseDown);
  $(".piece").mouseup(mouseUp);
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
  if (up.hasClass(player_team)) {
    console.log("Over an ally!");
    return false;
  }
  if (down.hasClass(enemy_team)) {
    console.log("Moving an enemy");
    return false;
  }
  return true;
}

function linear_to_coords(linear) {
  var row = Math.floor(linear / 8);
  var col = String.fromCharCode(65+(linear % 8));
  return col+row;
}

function log_movement(down, up) {
  $(".log_view").val($(".log_view").val() + "[You] "+down.text() + linear_to_coords(down.attr("id")) + " -> " + linear_to_coords(up.attr("id")) + "(" + up.text() + ")\n");
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

    log_movement($("#"+id), $(e.target));
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
      socket.emit('move', {sid: sid, match: code, player: player, from: current, to: target});
    }
  } else {
    console.log("frontend illegal");
  }

  $(".piece").off('mouseenter');

}

function toggleLoading(event){
  $(".loading").addClass('hidden');

/*  if ($(".loading").hasClass('hidden')){
    $(".loading").removeClass('hidden');
  } else {
    $(".loading").addClass('hidden');
  }*/
}
