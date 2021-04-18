$(document).ready(function(){
  generateBoard();
});

var br = {key: "&#9820", team: "black_team"};
var bh = {key: "&#9822", team: "black_team"};
var bb = {key: "&#9821", team: "black_team"};
var bq = {key: "&#9819", team: "black_team"};
var bk = {key: "&#9818", team: "black_team"};
var bp = {key: "&#9823", team: "black_team"};

var wr = {key: "&#9814", team: "white_team"};
var wh = {key: "&#9816", team: "white_team"};
var wb = {key: "&#9815", team: "white_team"};
var wq = {key: "&#9813", team: "white_team"};
var wk = {key: "&#9812", team: "white_team"};
var wp = {key: "&#9817", team: "white_team"};

var z = {key: "", team: "neutral"};

var initial_board = [
  [br, bh, bb, bq, bk, bb, bh, br],
  [bp, bp, bp, bp, bp, bp, bp, bp],
  [z,z,z,z,z,z,z,z],
  [z,z,z,z,z,z,z,z],
  [z,z,z,z,z,z,z,z],
  [z,z,z,z,z,z,z,z],
  [wp, wp, wp, wp, wp, wp, wp, wp],
  [wr, wh, wb, wq, wk, wb, wh, wr]
];

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
  generateLimit();
  for (i = 0; i < 8; i++) {
    appendLimit(i);
    for (j = 0; j < 8; j++) {
      $( ".chessboard" ).append("<div id=\""+(i*8+j)+"\" class =\"piece "+color(i,j)+" "+initial_board[i][j].team+"\">"+initial_board[i][j].key+"</div>");
    }
    appendLimit(i);
  }
  generateLimit();

  $(".piece").mousedown(mouseDown);
  $(".piece").mouseup(mouseUp);
}

var id
function mouseDown(e) {
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
  if (up.hasClass("white_team")) {
    console.log("Over an ally!");
    return false;
  }
  if (down.hasClass("black_team")) {
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


function mouseUp(e) {
  var current = $(e.target).attr("id");

  if (legal($("#"+id), $(e.target))) {
    log_movement($("#"+id), $(e.target));
    $(e.target).text($("#"+id).text());
    $("#"+id).text(z.key);

    if ($(e.target).hasClass("black_team")) {
      $(e.target).removeClass("black_team");
    } else if ($(e.target).hasClass("neutral")) {
      $(e.target).removeClass("neutral");
    }
    $(e.target).addClass("white_team");
    $("#"+id).removeClass("white_team");
    $("#"+id).addClass("neutral");
    console.log("UP: "+id);
  } else {
    console.log("illegal");
  }

  $(".piece").off('mouseenter');

}
