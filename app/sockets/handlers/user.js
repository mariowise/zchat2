
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

	this.openRoom = function (socket, roomId) {
		User.openRoom(socket.lid, roomId)
	}

	this.closeRoom = function (socket, roomId) {
		User.closeRoom(socket.lid, roomId)
	}

	this.updateRoom = function (socket, room) {
		User.updateRoom(socket.lid, room.roomId, room.size)
	}

	this.updateChatFriends = function (socket, state) {
		User.setChatFriends(socket.lid, state)
	}

	this.renameTab = function (socket, chunk) {
		User.renameRoom(socket.lid, chunk.old, chunk.new)
	}

	return this
}

