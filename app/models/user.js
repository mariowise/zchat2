
var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, _ = require('underscore')

var userSchema = new Schema({
	_id			: 	{ type: String, unique: true, index: true },
	username	: 	String,
	secret		: 	String,
	state		: 	String,
	chatFriends : 	String,
	openRooms 	: 	[new Schema({
		roomId 	: 	String,
		size 	: 	String,
		name 	: 	String,
		pos 	: 	Number
	}, { _id: false })]
});

userSchema.statics = {

	edit: function (userId, userData, next) {
		var self = this
		this.update(
			{ _id: userId },
			{ $set: userData },
			{ upsert: true },
			function (err, numberAfected, raw) {
				if(err) {
					console.log("* ERROR: Model User::edit can't upsert the user '"+ userId +"'")
					console.log(err)
				}
				self.findOne({ _id: userId }, function (err, neo) {
					if(err) {
						console.log("* ERROR: Model User::edit can't find the just added user '"+ userId +"'.")
						console.log(err)
					}
					if(neo.chatFriends == undefined) neo.chatFriends = 'closed'
					if(neo.openRooms == undefined) neo.openRooms = []
					neo.save()
					if(next) next(err, neo)
				})
			}
		)
	}

	, openRoom: function (userId, roomId, next) {
		this.findOne({ _id: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model User::openRoom for user '"+ userId +"' not found.")
				console.log(err)
				return (next) ? next(err, neo) : undefined
			}
			var ix = indexOf(roomId, neo.openRooms)
			if(ix == -1) 
				neo.openRooms.push({
					roomId: roomId,
					size: 'max',
					name: '',
					pos: 0
				})
			neo.save()
			console.log("Model User::openRoom register roomId '"+ roomId +"' successfully.")
			if(next) next(err, neo)
		})
	}

	, closeRoom: function (userId, roomId, next) {
		this.findOne({ _id: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model User::closeRoom for user '"+ userId +"' not found.")
				console.log(err)
				return (next) ? next(err, neo) : undefined
			}
			var ix = indexOf(roomId, neo.openRooms)
			if(ix != -1) neo.openRooms.splice(ix, 1)
			else {
				console.log("* ERROR: Model User::closeRoom can't find the room '"+ roomId +"' on the user '"+ userId +"'.")
				console.log(neo.openRooms)
				return (next) ? next(err, neo) : undefined
			}
			neo.save()
			console.log("Model User::closeRoom delete openRoom for user '"+ userId +"' and room '"+ roomId +"' successfully.")
			if(next) next(err, neo)
		})
	}

	, updateRoom: function (userId, roomId, size, next) {
		this.findOne({ _id: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model User::updateRoom can't locate the user '"+ userId +"' for updating his openRooms state.")
				console.log(err)
				return (next) ? next(err, neo) : undefined
			}
			var ix = indexOf(roomId, neo.openRooms)
			if(ix != -1) neo.openRooms[ix].size = size
			else {
				console.log("* ERROR: Model User::updateRoom can't find the room '"+ roomId +"' on the user '"+ userId +"'.")
				console.log(neo.openRooms)
				return (next) ? next(err, neo) : undefined
			}
			console.log("Model User::updateRoom Update on state for user '"+ userId +"' and room '"+ roomId +"' now is '"+ size +"'.")
			neo.save()
			if(next) next(err, neo)
		})
	}

	, renameRoom: function (userId, old, _new, next) {
		this.findOne({ _id: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model User::renameRoom can't locate the user '"+ roomId +"' for rename a room.")
				console.log(err)
				return (next) ? next(err, neo) : undefined
			}
			var ix = indexOf(old, neo.openRooms)
			if(ix != -1) neo.openRooms[ix].roomId = _new
			else {
				console.log("* ERROR: Model User::renameRoom can't find room '"+ old +"' to rename it on user '"+ userId +"'")
				console.log(neo.openRooms)
				return (next) ? next(err, neo) : undefined
			}
			if(next) next(err, neo)
		})
	}

	, setChatFriends: function (userId, state, next) {
		this.update(
			{ _id: userId },
			{ $set: { chatFriends: state } },
			function (err, numberAfected, raw) {
				if(err) {
					console.log("* ERROR: Model User::setChatFriends can't perform update over '"+ userId +"'.")
					console.log(err)
				}
				if(next) next(err, numberAfected, raw)
			}
		)
	}

};

function indexOf(roomId, list) {
	var res = -1
	var i = 0
	_.each(list, function (elem) {
		if(elem.roomId == roomId) res = i		
		i++
	})
	return res
}

mongoose.model('user', userSchema);
