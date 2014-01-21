
var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, _ = require('underscore')

var messageSchema = new Schema({
	roomId		: 	{ type: String, index: true },
	userId		: 	String,
	username 	: 	String,
	message 	: 	String,
	created		: 	{ type: Date, default: Date.now }
});

messageSchema.statics = {

	addFromMembers: function (members, userId, message, next) {
		var self = this
		  , User = mongoose.model('user')
		User.findOne({ _id: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model Message::addFromMembers can't find user '"+ userId +"'")
				console.log(err)
				return (next) ? next(err, neo) : undefined
			}	
			self.create({
				roomId: "$$" + members.sort().join("$$"),
				userId: userId,
				username: neo.username,
				message: message
				// created => default
			}, function (err, neo) {
				if(err) {
					console.log("* ERROR: Model Message::addFromMembers can't create message from '"+ userId +"' to room '"+ members.join("$$") +"'")
					console.log(err)
				}
				console.log()
				console.log("Model Message: new message from '"+ userId +"' to '"+ neo.roomId +"'")
				console.log("\t"+ neo.message)
				if(next) next(err, neo)
			})
		})
	}

	, addToRoom: function (roomId, userId, message, next) {
		var self = this
		  , User = mongoose.model('user')
		User.findOne({ userId: userId }, function (err, neo) {
			if(err) {
				console.log("* ERROR: Model Message::addToRoom can't find user '"+ userId +"'")
				console.log(err)
				return (next) ? next(err, neo) : undefined
			}
			self.create({
				roomId: roomId,
				userId: userId,
				message: message
				// created => default
			}, function (err, neo) {
				if(err) {
					console.log("* ERROR: Model Message::addToRoom can't create message from '"+ userId +"' to room '"+ roomId +"'")
					console.log(err)
				}
				if(next) next(err, neo)
			})
		})
	}

	, getFewFromMembers: function (members, cant, next) {
		var roomId = "$$" + members.sort().join("$$")
		this.find({ roomId: roomId }).sort('-created').limit(cant).exec(function (err, docs) {
			if(err) {
				console.log("* ERROR: Model Message::getFewFromMembers can't get the "+ cant +" messages from room '"+ roomId +"'")
				console.log(err)
			}
			if(next) next(err, docs)
		})
	}

	, getFewFromRoom: function (roomId, cant, next) {
		this.find({ roomId: roomId }).sort('-created').limit(cant).exec(function (err, docs) {
			if(err) {
				console.log("* ERROR: Model Messge::getFewFromRoom can't get the "+ cant +" messages from room '"+ roomId +"'")
				console.log(err)
			}
			if(next) next(err, docs)
		})
	}

};

mongoose.model('message', messageSchema);
