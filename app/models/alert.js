
var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, _ = require('underscore')

var alertSchema = new Schema({
	userId 		: 	{ type: String, index: true }, 	// Alert addresse
	peerId 		: 	{ type: String, index: true }, 	// Alert creator
	cant 		: 	{ type: Number, default: 0 }
});

alertSchema.statics = {

	add: function (userId, peerId, next) {
		this.update(
			{ userId: userId, peerId: peerId },
			{ $inc: { cant: 1 } },
			{ upsert: true },
			function (err, numberAfected, raw) {
				if(err) {
					console.log("* ERROR: Model Alert::add can't update for userId '"+ userId +"' on peerId '"+ peerId +"'")
					console.log(err)
				}
				console.log("Model Alert user '"+ userId +"' alerts to '"+ peerId +"'")
				if(next) next(err, numberAfected, raw)
			}
		)
	}

	, setZero: function (userId, peerId, next) {
		this.update(
			{ userId: userId, peerId: peerId },
			{ $set: { cant: 0 } },
			{ upsert: true },
			function (err, numberAfected, raw) {
				if(err) {
					console.log("* ERROR: Model Alert::setZero can't update for userId '"+ userId +"' on peerId '"+ peerId +"'")
					console.log(err)
				}
				if(next) next(err, numberAfected, raw)
			}
		)
	}

};

mongoose.model('alert', alertSchema);