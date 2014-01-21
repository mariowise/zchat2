
var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, _ = require('underscore')

var userSchema = new Schema({
	_id			: 	{ type: String, unique: true, index: true },
	username	: 	String,
	secret		: 	String,
	state		: 	String,
	chatFriends : 	String,
	maxRooms 	: 	[],
	minRooms	: 	[]
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
					if(neo.maxRooms == undefined) neo.maxRooms = []
					if(neo.minRooms == undefined) neo.minRooms = []
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
			neo.maxRooms.push(roomId)
			neo.maxRooms = _.uniq(neo.maxRooms)
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
			neo.maxRooms = _.without(neo.maxRooms, roomId)
			neo.minRooms = _.without(neo.minRooms, roomId)
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
			neo.maxRooms = _.without(neo.maxRooms, roomId)
			neo.minRooms = _.without(neo.minRooms, roomId)
			if(size == 'max')
				neo.maxRooms.push(roomId)
			else
				neo.minRooms.push(roomId)
			console.log("Model User::updateRoom Update on state for user '"+ userId +"' and room '"+ roomId +"' now is '"+ size +"'.")
			neo.save()
			if(next) next(err, neo)
		})
	}

	, buildRoomList: function (userId, next) {
		this.findOne({ _id: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model User::buildRoomList can't locate the user '"+ userId +"' for building the openRoom list.")
				console.log(err)
				return (nex) ? next(err, neo) : undefined
			}
			var list = []
			_.each(neo.maxRooms, function (key, value) {
				list.push({ roomId: key, size: 'max' })
			})
			_.each(neo.minRooms, function (key, value) {
				list.push({ roomId: key, size: 'min'})
			})
			if(next) next(err, neo, list)
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

mongoose.model('user', userSchema);
