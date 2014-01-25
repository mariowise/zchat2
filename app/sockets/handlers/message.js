
var mongoose        = require('mongoose')
  , config 			= require('../../../config/config')['development']
  , crypto 			= require('crypto')
  , _ 				= require('underscore')

var User 		= 	mongoose.model('user')
  , Message 	= 	mongoose.model('message')
  , Alert 		= 	mongoose.model('alert')

var io = undefined
  , socketsById = undefined

module.exports = function (_io, _socketsById) {
	io = _io
	socketsById = _socketsById

	this.messageTo = function (socket, msg) {
		var from = socket.lid
		  , to = msg.to
		  , toa = to.split('$$')

		Message.addFromMembers([from].concat(toa), socket.lid, msg.msg, function (err, newOne) { 
			_.each(socketsById[from].socketList, function (el) {
				el.emit('message-from', {
					from: {
						id 			: socket.lid,
						username 	: socket.username
					},
					to: { id: to },
					msg 	: msg.msg,
					created : newOne.created
				})
			})
			
			User.find({ _id: { $in: [from].concat(toa) }}, function (err, docs) {
				_.each(toa, function (item) {
					if(socketsById[item] != undefined)
						_.each(socketsById[item].socketList, function (sock) {
							// if(sock.lid != socket.lid)
								sock.emit('message-from', {
									from: { 
										id: socket.lid
										, username: socket.username 
										, groupData: (toa.length == 1) ? undefined : docs
									},
									to: {
										id: item
									},
									msg: msg.msg,
									created: newOne.created
								})
						})
					else if(toa.length == 1) // El usuario no esta conectado
						Alert.add(item, socket.lid)
				})
			})
		});
	}

	this.messageGet = function (socket, members) {
		lmembers = [socket.lid].concat(members)
		Message.getFewFromMembers(lmembers, 30, function (err, docs) {
			console.log('conversation-flush de '+ docs.length + ' mensajes.')
			socket.emit('conversation-flush', { peer: members, conv: docs })
		})
	}

	return this
}
