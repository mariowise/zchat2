
var mongoose        = require('mongoose')
  , config 			= require('../../config/config')['development']
  , crypto 			= require('crypto')
  , _ 				= require('underscore')

var io = require('socket.io').listen(config['socket.io'].port, { log: false })
  , User = mongoose.model('user')
  , Alert = mongoose.model('alert')
  , socketsById = {}
  , _security = require('./handlers/security')(io, socketsById)
  , _message = require('./handlers/message')(io, socketsById)
  , _alert = require('./handlers/alert')(io, socketsById)
  , _user = require('./handlers/user')(io, socketsById)

console.log('Soporte para socket.io corriendo en puerto ' + config['socket.io'].port)

// Todos los usuarios offline al partir el server ** DEBERÍA SER SYNC **
User.update({}, { $set: { state: 'offline' } }, { multi: true }, function () {
	console.log('Todos los usuarios con estado "offline"')
})

io.sockets.on('connection', function(socket) {
	
	
	socket.on('i-am', function (chunk) {
		if(_security.securityCheck(chunk)) {
			_security.login(socket, chunk)
		} // or nothing
	})


	socket.on('message-to', function(msg) {
		_message.messageTo(socket, msg)
	})


	socket.on('alert-pop', function(peerId) {
		_alert.alertPop(socket, peerId)
	})


	socket.on('alert-create', function(peerId) {
		_alert.alertCreate(socket, peerId)
	})


	socket.on('open-tab', function (roomId) {
		_user.openRoom(socket, roomId)
	})


	socket.on('close-tab', function (roomId) {
		_user.closeRoom(socket, roomId)
	})


	socket.on('update-tab', function (room) {
		_user.updateRoom(socket, room)
	})


	socket.on('update-chatFriends', function (state) {
		_user.updateChatFriends(socket, state)
	})


	socket.on('message-get', function(roomId) {
		_message.messageGet(socket, roomId)
	})


	socket.on('create-group', function (userlist) {
		// Deprecated (Now does nothing)

		// var room_id = ''
		// userlist.push(socket.lid)
		// for(el in userlist.sort())
		// 	room_id += '$$' + userlist[el]
		// Sala.create({ room_id: room_id }, function () {})
	})


	socket.on('update-chatWindow', function (members) {
		var oldUserList = members.oldId.split('$$')
		_.each(oldUserList, function (item) {
			if(socketsById[item] != undefined && item != socket.lid) {
				_.each(socketsById[item].socketList, function (sock) {
					sock.emit('update-chatWindow', members)
				})
			}
		})
	})


	socket.on('disconnect', function() {
		if(socketsById[socket.lid] != undefined) {
			socketsById[socket.lid].socketList.splice(socket.offset, 1)
			if(socketsById[socket.lid].socketList.length == 0) {
				User.update({ _id: socket.lid }, { $set: { state: 'offline' }}, null, function() {
					delete socketsById[socket.lid]
					console.log("Handler Index::disconnect User '"+ socket.lid +"' marked has disconnected.")
					socket.broadcast.emit('user-update', { id: socket.lid, username: socket.username, state: 'offline' })
				})
			}
		} else
			console.log("* ERROR: Handler Index::disconnect User '"+ socket.lid +"' with no socket has trigger disconnect event (severe).")
	})
})