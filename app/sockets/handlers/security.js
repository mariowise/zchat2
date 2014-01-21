
var mongoose        = require('mongoose')
  , config 			= require('../../../config/config')['development']
  , crypto 			= require('crypto')
  , _ 				= require('underscore')

var User 		= 	mongoose.model('user'),
	Message 	= 	mongoose.model('message'),
	Alert 		= 	mongoose.model('alert')

var io = undefined
  , socketsById = undefined

module.exports = function (_io, _socketsById) {
	io = _io
	socketsById = _socketsById

	this.securityCheck = function (chunk) {
		var decipher = crypto.createDecipheriv('aes-128-cbc', 'abcdefghijklmnop', '0123456789123456')
		  , decrypted = decipher.update(chunk.secret, 'hex', 'utf-8')
		  , decData = ''
		decrypted += decipher.final('utf-8')
		chunk.secret = decrypted
		decData = chunk.secret.split("$$")
		if(decData[0] === "zchat_secret" && decData[1] === chunk.id)
			return true
		else {
			console.log("* REJECTED: Security::securityCheck The user '"+ chunk.id +"' has tried to access with wgrong credentials. Possible cracking attempt detected.")
			// console.log(decData)
			return false
		}
	}

	this.login = function (socket, chunk) {
		User.edit(chunk.id, {
			username: chunk.username,
			secret: chunk.secret,
			state: 'online'
		}, function (err, numberAfected, raw) {
			if(err) return;
			
			// Sockets push
			if(socketsById[chunk.id] == undefined) {
				socketsById[chunk.id] = { socketList: [] };
				console.log("Handler Security::login User '"+ chunk.username +"' marked has connected.")
			}
			socketsById[chunk.id].socketList.push(socket);
			socket.broadcast.emit('user-update', { id: chunk.id, username: chunk.username, state: 'online' });
			socket.lid 		= 	chunk.id;
			socket.username = 	chunk.username;
			socket.offset 	= 	socketsById[chunk.id].socketList.length-1;
			
			// Bring data to session
			User.find({}, function(err, docs) {
				// console.log(docs)
				_.each(docs, function (doc) {
					if(doc._id != socket.lid)
						socket.emit('user-update', {
							id: doc._id,
							username: doc.username,
							state: doc.state
						})
				})
				
				Alert.find({ userId: socket.lid }, function(err, docs) {
					socket.emit('alerts-flush', docs);
				});
				
				User.buildRoomList(socket.lid, function (err, neo, list) {
					if(err) return;
					socket.emit('open-tabs', list)
				})
				// User.findOne({ _id: socket.lid }, function (err, neo) {
				// 	if(err) return;
				// 	socket.emit('open-tabs', neo.openRooms);
				// });
			});
		})
	}

	return this
}
