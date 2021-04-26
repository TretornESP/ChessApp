var match_text = '\
  <div>\
    <div>%whites% vs %blacks%</div>\
    <div>%wclock%s - %bclock%s</div>\
    <div>%link%</div>\
    <div><a target="_blank" href="%admin%">Administrar</a>\
    <a target="_blank" href="%whites_link%">Blancas</a>\
    <a target="_blank" href="%blacks_link%">Negras</a>\
    <a target="_blank" href="%spectator_link%">Espectar</a></div>\
  </div>\
';

$(document).ready(function () {

  socket = io(window.location.host);

  socket.on('receive_cpanel_data', function(msg, cb) {
    $("#match_count_div").html("<h3>"+msg.match_count+"</h3");
    $("#active_count_div").html("<h3>"+msg.active_count+"</h3");
    $("#finished_count_div").html("<h3>"+msg.finished_count+"</h3");
    $("#event_count_div").html("<h3>"+msg.event_count+"</h3");
    $("#error_count_div").html("<h3>"+msg.error_count+"</h3");
  });

  socket.on('search_matches_result', function(msg, cb) {
    console.log("RESULT LEN: " + msg.lenght);
    $("#partidas").empty();
    var str;
    msg.found.forEach(function(valor, indice, array) {
      str = match_text.replace("%link%", "<iframe src='" + valor.viewers_link + "' title='match' allowfullscreen></iframe>");
      str = str.replace("%whites%", valor.whites_name);
      str = str.replace("%blacks%", valor.blacks_name);
      str = str.replace("%wclock%", valor.whites_clock);
      str = str.replace("%bclock%", valor.blacks_clock);
      str = str.replace("%admin%", valor.admins_link);
      str = str.replace("%whites_link%", valor.whites_link);
      str = str.replace("%blacks_link%", valor.blacks_link);
      str = str.replace("%spectator_link%", valor.viewers_link);

      $("#partidas").append(str);
    });
  });

  socket.on('new_event', function(msg, cb) {
    console.log("NEW EVENT");
    $.gritter.add({
        // (string | mandatory) the heading of the notification
        title: msg.requester,
        // (string | mandatory) the text inside the notification
        text: msg.type,
        // (string | optional) the image to display on the left
        image: '{{ url_for("static", filename="assets/img/ui-sam.jpg")}}',
        // (bool | optional) if you want it to fade out on its own or just sit there
        sticky: true,
        // (int | optional) the time you want it to be alive for before fading out
        time: 1,
        // (string | optional) the class name you want to apply to that specific message
        class_name: 'my-sticky-class'
    });
  });

  socket.on('finished_provided', function(msg, cb) {
    $("#table-fillme").find("tr:not(:first)").remove();
    console.log("FINISHED MATCH DATA ARRIVED");
    msg.forEach(function(valor, indice, array) {
      console.log("CUAK");
      $("#table-fillme > tbody:last-child").append(
        '<tr><td>'+valor.codigo+
        '</td><td>'+valor.blancas+
        '</td><td>'+valor.negras+
        '</td><td>'+valor.ganador+
        '</td><td>'+valor.hora_inicio+
        '</td><td>'+valor.hora_fin+
        '<td><a href="#">Ver</a></td>'+
        '<td><a href="#">Eliminar</a></td>'+
        '</tr>'
      );
    });
  });

  $("#search_button").click(function() {
    var criteria = $("#search_text").val();
    console.log("saerch clicked!. criteria " + criteria);
    socket.emit('search_matches', {criteria: criteria});
  });

  $("#refresh-results").click(function() {
    console.log("Requesting table results");
    socket.emit('request_finished');
  });

  socket.emit('join_cpanel');

  setInterval(() => {
    socket.emit('request_cpanel_data');
  }, 5000);
});
