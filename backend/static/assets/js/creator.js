$(document).ready(function () {

  socket = io(window.location.host);

  socket.emit('join_cpanel');


  socket.on('receive-new-match', function(msg, cb) {
    console.log("RECEIVED LINKS");
    $("#resultados > tbody:last-child").append(
      '<tr><td>'+msg.code+
      '</td><td>'+msg.whites_name+
      '</td><td><a href="'+msg.whites_link+'">'+msg.whites_link+'</a>'+
      '</td><td>'+msg.blacks_name+
      '</td><td><a href="'+msg.blacks_link+'">'+msg.blacks_link+'</a>'+
      '</td><td><a href="'+msg.admins_link+'">'+msg.admins_link+'</a>'+
      '</td><td><a href="'+msg.viewers_link+'">'+msg.viewers_link+'</a>'+
      '</tr>'
    );
  });

  

  $("#crear-partida").click(function() {
    console.log("CREANDO PARTIDA");
    socket.emit('create-match', {whites: $("#jugador-blancas").val(), blacks: $("#jugador-negras").val()});
  });
});
