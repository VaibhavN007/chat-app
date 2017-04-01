var express = require('express');
var router = express.Router();
var io = require('socket.io')(8000);

var currentRooms = {};
var all_the_rooms = [];

var currentNames = {};
var namesUsed = [];

String.prototype.hashCode = function() {
	var hash = 0, i, chr, len;
	if (this.length === 0) return hash;
	for (i = 0, len = this.length; i < len; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

function objectLength(obj){
	return Object.keys(obj).length;
}

function generateName(socket) {
	var name = 'Guest';

	var decimal = 1000;
	var random_no = Math.round(Math.random() * decimal);
	var count = 0;
	var count_checkpoint = 5;

	name = name + random_no;

	while(namesUsed.indexOf(name) != -1) {
		random_no = Math.round(Math.random() * decimal);
		name = name + random_no; 
		count++;

		if(count > count_checkpoint) {
			decimal = decimal*10;
			count_checkpoint = count_checkpoint*2;
		}
	}

	return name;
}

function getAllRooms() {
	return io.sockets.adapter.rooms;
}

function getAllRoommates(socket_id) {
	var rooms = getAllRooms();

	var room_Object = rooms[currentRooms[socket_id]];
	
	var roommates_id = Object.keys(room_Object.sockets);
	
	var roommate_names = [];
	
	roommates_id.forEach(function(roommate_id, index) {
		roommate_names.push(currentNames[roommate_id]);
	});

	console.log(roommate_names);

	return roommate_names;
}

io.on('connection', function (socket) {

	//	assign a name to the client
	currentNames[socket.id] = generateName(socket);
	namesUsed.push(currentNames[socket.id]);

	//	tell the client his name
	socket.emit('getMyName', currentNames[socket.id]);

	currentRooms[socket.id] = io.sockets.adapter.rooms[socket.id];

	//	all clients are sent to 'Lobby' room
	socket.leave(currentRooms[socket.id]);
	socket.join('Lobby');
	currentRooms[socket.id] = 'Lobby';

	socket.emit('join_result', 'You joined Lobby');
	socket.broadcast.to('Lobby').emit('join_result', currentNames[socket.id] + ' joined Lobby');

	socket.emit('getMyRoom', currentRooms[socket.id]);
	socket.emit('rooms', all_the_rooms);
	
	socket.emit('roommates', getAllRoommates(socket.id));
	socket.broadcast.to('Lobby').emit('roommates', getAllRoommates(socket.id));

	if(all_the_rooms.indexOf('Lobby') == -1) {
		all_the_rooms.push('Lobby');
		io.emit('rooms', all_the_rooms);
	}


	socket.on('message', function(message, sender, received_date, received_time) {
		socket.broadcast.to(currentRooms[socket.id]).emit('message', message, currentNames[socket.id], received_date, received_time);
	});

	socket.on('join', function(next_room) {

		if(next_room != currentRooms[socket.id] && next_room!='') {

			console.log(socket.id, 'wants to join the room', next_room);
			//	get the current room
			var current_room = currentRooms[socket.id];
			var room_Object = io.sockets.adapter.rooms[current_room];

			//	get the number of clients in the current room
			var no_of_clients = room_Object.length;

			// if only one client is present, remove current_room from all_the_rooms
			if(no_of_clients == 1) {
				var index = all_the_rooms.indexOf(current_room);

				if(index != -1) {
					all_the_rooms.splice(index, 1);
					io.emit('rooms', all_the_rooms);
				}
			}

			//	broadcast to current_room that client has left the room and update their roommates list
			socket.broadcast.to(current_room).emit('join_result', currentNames[socket.id] + ' has left the room');
			
			var old_roommates = getAllRoommates(socket.id);
			var index_in_roommates_list = old_roommates.indexOf(currentNames[socket.id]);

			if(index_in_roommates_list != -1) {
				old_roommates.splice(index_in_roommates_list, 1);
				socket.broadcast.to(current_room).emit('roommates', old_roommates, 1);
			}
			else
				socket.broadcast.to(current_room).emit('roommates', old_roommates);

			//	leave the current_room and join the next_room
			socket.leave(current_room);
			socket.join(next_room);

			//	change the value in currentRooms
			currentRooms[socket.id] = next_room;

			//	emit the new room to the client
			socket.emit('getMyRoom', next_room);
			
			if(all_the_rooms.indexOf(next_room) == -1) {
				//	if it is a new room, add it to all_the_rooms
				all_the_rooms.push(next_room);
				
				// change the room_list for all the clients
				io.emit('rooms', all_the_rooms);
				socket.emit('roommates', getAllRoommates(socket.id));

			}

			//	update the room list of client
			socket.emit('rooms', all_the_rooms);
			
			//	tell everyone in the room about the new client
			socket.emit('join_result', 'You joined '+next_room);
			socket.broadcast.to(currentRooms[socket.id]).emit('join_result', currentNames[socket.id] + ' joined this room');
			
			// update the roommates list for everyone in the room
			socket.emit('roommates', getAllRoommates(socket.id));
			socket.broadcast.to(currentRooms[socket.id]).emit('roommates', getAllRoommates(socket.id));
		
		}
	});
	
	socket.on('change_name', function(name){
		var name_result = {
			success: false,
			message: '',
			new_name: ''
		};

		if(name == currentNames[socket.id]) {
			name_result.success = false;
			name_result.message = 'You already have that name';
			socket.emit('name_result', name_result);
		}
		else if(name && name != '') {

			if(namesUsed.indexOf(name) == -1) {

				var previous_name = currentNames[socket.id];

				//	update namesUsed
				namesUsed.splice(namesUsed.indexOf(previous_name), 1);
				namesUsed.push(name);

				//	update currentNames
				currentNames[socket.id] = name;

				name_result.success = true;
				name_result.new_name = name;

				//	update socket's name in client side
				socket.emit('getMyName', currentNames[socket.id]);

				//	tell everyone in room about successful name change
				name_result.message = 'You changed name from '+previous_name+' to '+name;
				socket.emit('name_result', name_result);
				name_result.message = previous_name+' changed name to '+name;
				socket.broadcast.to(currentRooms[socket.id]).emit('name_result', name_result);

				socket.emit('roommates', getAllRoommates(socket.id));
				socket.broadcast.to(currentRooms[socket.id]).emit('roommates', getAllRoommates(socket.id));

			} else {
				name_result.success = false;
				name_result.message = 'Name already used. Please try another name';
				socket.emit('name_result', name_result);
			};

		} else {
			name_result.success = false;
			name_result.message = 'You already have that name';
			socket.emit('name_result', name_result);
		}
		console.log(name_result);
	});

	socket.on('leave_chat', function(){

		var socket_id = socket.id;
		var name = currentNames[socket_id];
		var room = currentRooms[socket_id];
		var roommates = getAllRoommates(socket_id);
		var no_of_clients = roommates.length;

		console.log('**********************');
		console.log('**********************');
		console.log(socket_id, name, 'wants to leave');
		console.log('**********************');
		console.log('**********************');

		//	if only one client is present, remove current_room from all_the_rooms
		if(no_of_clients == 1) {
			var index = all_the_rooms.indexOf(room);

			if(index != -1) {
				all_the_rooms.splice(index, 1);
				io.emit('rooms', all_the_rooms);
			}
		} else {
			//	there are roommates, so update their roommates-list
			//	but roommates variable still has the name of left client
			var index_in_roommates_list = roommates.indexOf(name);

			if(index_in_roommates_list != -1) {
				roommates.splice(index_in_roommates_list, 1);
				socket.broadcast.to(room).emit('roommates', roommates, 1);
			}
			else
				socket.broadcast.to(room).emit('roommates', roommates);
			
			socket.broadcast.to(room).emit('join_result', name + ' has left the room');
		}

		//	leave the room
		socket.leave(room);

		//	delete from the namesUsed array
		var name_index = namesUsed.indexOf(name);
		if(name_index != -1) {
			namesUsed.splice(name_index, 1);
		}
		
		//	delete from the currentRooms obj
		delete currentRooms[socket_id];

		//	delete from	the currentNames obj
		delete currentNames[socket_id];
	});

	// socket.emit('getMyRoom', currentRooms[socket.id]);
	// socket.emit('getMyName', currentNames[socket.id]);
	// socket.emit('rooms', all_the_rooms, currentRooms[socket.id]);

});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('chat');
});


module.exports = router;
