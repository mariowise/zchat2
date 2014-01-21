
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

	this.alertPop = function (socket, peerId) {
		Alert.setZero(socket.lid, peerId)
	}

	this.alertCreate = function (socket, peerId) {
		Alert.add(socket.lid, peerId, function () {
			Alert.find({ userId: socket.lid }, function(err, docs) {
				socket.emit('alerts-flush', docs);
			});
		})
	}

	return this
}

