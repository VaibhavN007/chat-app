$(document).ready(function(){
	var my_room, my_name;

	var message_cleared = false, notif_cleared = false;

	var socket = io.connect('http://localhost:8000/');
	
	function divEscapedContentElement(message) {
		return $('<div></div>').text(message);
	}
	
	function processUserInput() {
		var message = $('#send-message').val();

		if(message == '')
			return;

		if(message.charAt(0)=='/')
		{
			var words = message.split(' ');

			var command = words[0].substring(1, words[0].length).toLowerCase();

			var message = false;

			switch(command)
			{
				case 'join':
					words.shift();
					var room = words.join(' ');
					if(room && room!='')
						socket.emit('join', room);
					break;

				case 'nick':
					words.shift();
					var name = words.join(' ');
					console.log('command', $('#name').text(), 'wants to change name to', name);
					if(name && name!='')
						socket.emit('change_name', name);
					break;

				case 'clear':
				case 'x':
					if(message_cleared == true)
					{
						$('.circle').removeClass('hide');
						$('.sender').removeClass('hide');
						$('.date').removeClass('hide');
						$('.triangle').removeClass('hide');
						$('.my_message').removeClass('hide');
						$('.others_message').removeClass('hide');
						$('.time').removeClass('hide');
						$('.messages_break').removeClass('hide');
						message_cleared = false;
					}
					else
					{
						$('.circle').addClass('hide');
						$('.sender').addClass('hide');
						$('.date').addClass('hide');
						$('.triangle').addClass('hide');
						$('.my_message').addClass('hide');
						$('.others_message').addClass('hide');
						$('.time').addClass('hide');
						$('.messages_break').addClass('hide');
						message_cleared = true;
					}
					break;

				case 'notif':
					if(notif_cleared == true)
					{
						$('.join_result').removeClass('hide');
						$('.name_result').removeClass('hide');
						notif_cleared = false;
					}
					else
					{
						$('.join_result').addClass('hide');
						$('.name_result').addClass('hide');
						notif_cleared = true;
					}
					break;

				default:
					console.log('unrecognized command');
					break;
			}
		}
		else
		{
			console.log(my_name, 'sending message');
			var message_date = new Date();
			var DateString = message_date.toDateString();
			var TimeString = message_date.toTimeString();
			TimeString = TimeString.split(' ')[0];
			TimeString = TimeString.substring(0, 5);
			// var sending_time = [message_date.getHours(), message_date.getMinutes(), message_date.getSeconds()];
			/*
				'message' event has params as
			**	message text
			**	sender name
			**	date as DateString
			**	time as TimeString
			*/
			socket.emit('message', message, my_name, DateString, TimeString);
			if(message_cleared) {
				$('#messages').append('<div class="circle hide"></div>');
				$('#messages').append('<div class="sender hide">'+my_name+'</div>');
				$('#messages').append('<div class="date hide">'+DateString+'</div>');
				$('#messages').append('<div class="triangle my_message_triangle hide"></div>');
				$('#messages').append(divEscapedContentElement(message).addClass('message_text my_message hide'));
				$('#messages').append('<div class="time hide">'+TimeString+'</div>');
				$('#messages').append('<br class="messages_break hide">');
			} else {
				$('#messages').append('<div class="circle"></div>');
				$('#messages').append('<div class="sender">'+my_name+'</div>');
				$('#messages').append('<div class="date">'+DateString+'</div>');
				$('#messages').append('<div class="triangle my_message_triangle"></div>');
				$('#messages').append(divEscapedContentElement(message).addClass('message_text my_message'));
				$('#messages').append('<div class="time">'+TimeString+'</div>');
				$('#messages').append('<br class="messages_break">');
			}
			$('#messages').scrollTop($('#messages').scrollTop() + $('#messages').height());				
		}

	}

	socket.on('message', function(message, sender, received_date, received_time) {
		console.log('message received by client', message);
		if(message_cleared) {
			$('#messages').append('<div class="circle hide"></div>');
			$('#messages').append('<div class="sender hide">'+sender+'</div>');
			$('#messages').append('<div class="date hide">'+received_date+'</div>');
			$('#messages').append('<div class="triangle hide"></div>');
			$('#messages').append(divEscapedContentElement(message).addClass('message_text others_message hide'));
			$('#messages').append('<div class="time hide">'+received_time+'</div>');
			$('#messages').append('<br class="messages_break hide">');
		} else {	
			$('#messages').append('<div class="circle"></div>');
			$('#messages').append('<div class="sender">'+sender+'</div>');
			$('#messages').append('<div class="date">'+received_date+'</div>');
			$('#messages').append('<div class="triangle"></div>');
			$('#messages').append(divEscapedContentElement(message).addClass('message_text others_message'));
			$('#messages').append('<div class="time">'+received_time+'</div>');
			$('#messages').append('<br class="messages_break">');
		}

		$('#messages').scrollTop($('#messages').scrollTop() + $('#messages').height());	
	});

	socket.on('getMyRoom', function(myRoom) {
		my_room = myRoom;
		console.log('my room is', my_room);
		$('#room').text(myRoom);
	});

	socket.on('rooms', function(rooms) {
		$('#room-list').empty();

		rooms.forEach(function(room) {
			if(room != '') {
				if(room == my_room)
					$('#room-list').append(divEscapedContentElement(room).addClass('my_room'));
				else
					$('#room-list').append(divEscapedContentElement(room).addClass('other_room'));
			}

		});
	});

	socket.on('getMyName', function(name) {
		my_name = name;
		$('#name').text(name);
	})

	socket.on('join_result', function(join_result) {
		if(notif_cleared)
		{
			// $('#messages').append('<div class="join_result hide"><div>'+join_result+'</div></div>');
			$('#messages').append(divEscapedContentElement('').addClass('join_result hide').append(divEscapedContentElement(join_result)));
		}
		else
		{
			// $('#messages').append('<div class="join_result"><div>'+join_result+'</div></div>');
			$('#messages').append(divEscapedContentElement('').addClass('join_result').append(divEscapedContentElement(join_result)));
		}
		$('#messages').scrollTop($('#messages').scrollTop() + $('#messages').height());
	});

	socket.on('name_result', function(name_result) {
		if(name_result.success == true) {
			if(notif_cleared)
			{	
				
				$('#messages').append(divEscapedContentElement('').addClass('name_result hide').append(divEscapedContentElement(name_result.message)));
				// $('#messages').append('<div class="name_result hide"><div>'+divEscapedContentElement(name_result.message)+'</div></div>');
			}
			else
			{	
				$('#messages').append(divEscapedContentElement('').addClass('name_result').append(divEscapedContentElement(name_result.message)));
				// $('#messages').append('<div class="name_result"><div>'+divEscapedContentElement(name_result.message)+'</div></div>');
			}
			$('#messages').scrollTop($('#messages').scrollTop() + $('#messages').height());
		}
		else
			alert(name_result.message);
	});

	socket.on('roommates', function(roommates) {

		$('#roommates').empty();

		roommates.forEach(function(roommate) {
			if(roommate == my_name)
				$('#roommates').append(divEscapedContentElement(roommate).addClass('me'));
			else
				$('#roommates').append(divEscapedContentElement(roommate).addClass('others'));
		});

	});

	$('#send-form').submit(function(){
		processUserInput();
		$('#send-message').val('');
		return false;
	});

	$('#room-list').on('click', 'div', function(){
		$(this).closest('.other_room').click(function(){
			if(window.confirm('Do you want to join '+$(this).text())) {
				socket.emit('join', $(this).text());
			}
			return false;
		})
	});

	// $('#roommates').on('click', 'div', function(){
	// 	$(this).closest('.others').click(function(){

	// 		var chat_with_name = $(this).text();
			
	// 		if(window.confirm('Do you want to chat with ' + chat_with_name)) {
	// 			if(roommates_obj[chat_with_name])
	// 				socket.emit('private_chat', roommates_obj_global[chat_with_name], chat_with_name);
	// 			else
	// 				alert('no user found!!');
	// 		}
	// 		return false;
	// 	})
	// });

	$('#send-message').focus();

	$(window).bind('beforeunload',function(){
		console.log('leave_chat command sent');
		// socket.emit('leave_chat');
	});

});

