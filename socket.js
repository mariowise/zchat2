
var mongoose        = require('mongoose')
  , config 			= require('./config/config')['development']
  , crypto 			= require('crypto')
  , _ 				= require('underscore')

var Usuario 	= 	mongoose.model('user'),
	Sala 		=	mongoose.model('room'),
	Message 	= 	mongoose.model('message'),
	Alert 		= 	mongoose.model('alert')

var io = require('socket.io').listen(config['socket.io'].port, { log: false });
console.log('Soporte para socket.io corriendo en puerto ' + config['socket.io'].port);

var socketsById = {};

// Todos los usuarios offline al partir el server ** DEBERÍA SER SYNC **
Usuario.update({}, { $set: { state: 'offline' } }, { multi: true }, function () {
	console.log('Todos los usuarios con estado "offline"')
})

io.sockets.on('connection', function(socket) {
	socket.on('i-am', function(chunk) {
		var decipher = crypto.createDecipheriv('aes-128-cbc', 'abcdefghijklmnop', '0123456789123456')
		  , decrypted = decipher.update(chunk.secret, 'hex', 'utf-8');
			decrypted += decipher.final('utf-8');
			chunk.secret = decrypted;
		
		if(chunk.secret == 'zchat_secret') {
			Usuario.update({ _id: chunk.id }, { $set: { username: chunk.username, secret: chunk.secret , state: 'online' } }, { upsert: true }, function(err, numberAfected, raw) {
				if(socketsById[chunk.id] == undefined) {
					socketsById[chunk.id] = { socketList: [] };
					console.log('Usuario "'+ chunk.username +'" conectado a zchat.');
				}
				socketsById[chunk.id].socketList.push(socket);
				socket.broadcast.emit('user-update', { id: chunk.id, username: chunk.username, state: 'online' });
				socket.lid 		= 	chunk.id;
				socket.username = 	chunk.username;
				socket.offset 	= 	socketsById[chunk.id].socketList.length-1;
				Usuario.find({}, function(err, docs) {
					for(var i = 0; i < docs.length; i++) 
						socket.emit('user-update', { id: docs[i]._id, username: docs[i].username, state: docs[i].state });
					Alert.find({ user_id: socket.lid }, function(err, docs) {
						socket.emit('alerts-flush', docs);
					});
					Usuario.findOne({ _id: socket.lid }, function (err, user) {
						if(err) return;
						socket.emit('open-tabs', user.openTabs);
					});
				});
			});
		}
	});
	socket.on('message-to', function(msg) {
		var from = socket.lid
		  , to = msg.to
		  , toa = to.split('$$')

		Message.new([from].concat(toa), { 
			  user_id: socket.lid
			, username: socket.username
			, message: msg.msg }, function(err, newOne) {			
			console.log('  mensaje '+ from + ' -> '+ to +' : '+ msg.msg);
			console.log(newOne);
			for(var i = 0; i < socketsById[from].socketList.length; i++)
				socketsById[from].socketList[i].emit('message-from', { 
					from: { 
						id: socket.lid, 
						username: socket.username
					}, 
					msg: msg.msg,
					created: newOne.created
				});
			console.log('\nPropagando mensaje a la lista:')
			console.log(toa)
			console.log()
			Usuario.find({ _id: { $in: [from].concat(toa) }}, function (err, docs) {

				_.each(toa, function (item) {
					if(socketsById[item] != undefined)
						_.each(socketsById[item].socketList, function (sock) {
							if(sock.lid != socket.lid)
								sock.emit('message-from', {
									from: { 
										id: socket.lid
										, username: socket.username 
										, groupData: (toa.length == 1) ? 
											undefined :
											docs
									}, 
									msg: msg.msg,
									created: newOne.created
								})
						})
					else if(toa.length == 1) { // El usuario no esta conectado
						Alert.update({
							user_id: item,
							peer_id: socket.lid
						}, { $inc: { cant: 1 } }, { upsert: true },
						function() {
							console.log('  usuario '+ socket.lid +' alerta a '+ item +' y le deja un mensaje pendiente');
						});
					}
				})

			})
		});
	});
	socket.on('alert-pop', function(peer_id) {
		Alert.update({ user_id: socket.lid, peer_id: peer_id }, { $set: { cant: 0 } }, { upsert: true }, function(err, numberAfected, raw) {
			console.log('  devolviendo número de alertas a cero (docs actualizados: '+ numberAfected +')');
			console.log({ user_id: socket.lid, peer_id: peer_id });
		});
	});
	socket.on('open-tab', function (tabId) {
		Usuario.addTab(socket.lid, tabId, function() {
			// console.log('Enviando "open-tab" '+ socket.lid)
			_.each(socketsById[socket.lid].socketList, function (elem, index, list) {
				elem.emit('open-tab', tabId)
			})
		});
	});
	socket.on('close-tab', function (tabId) {
		Usuario.rmvTab(socket.lid, tabId);
		// console.log('Enviando close-tab a los demás socket')
		_.each(socketsById[socket.lid].socketList, function (elem, index, list) {
			elem.emit('force-close-tab', tabId)
		})
	});
	socket.on('message-get', function(peer) {
		var userlist = [];
		var room_id = '';
		userlist.push(socket.lid);
		for(p in peer)
			userlist.push(peer[p]);
		for(el in userlist.sort())
			room_id += '$$' + userlist[el];

		console.log('Buscando la conversación '+ room_id);
		Message.find({ room_id: room_id }).sort('-created').limit(30).exec(function(err, docs) {
			console.log('  se encontraron '+ docs.length +' mensajes.');
			socket.emit('conversation-flush', { peer: peer, conv: docs });
		});
	});
	socket.on('create-group', function (userlist) {
		var room_id = ''
		userlist.push(socket.lid)
		for(el in userlist.sort())
			room_id += '$$' + userlist[el]

		console.log('Creando sala grupal: ' + room_id);

		Sala.create({ room_id: room_id }, function () {})
	});
	socket.on('update-chatWindow', function (chunk) {
		var oldUserList = chunk.oldId.split('$$')
		
		_.each(oldUserList, function (item) {
			if(socketsById[item] != undefined && item != socket.lid) {
				_.each(socketsById[item].socketList, function (sock) {
					sock.emit('update-chatWindow', chunk)
				})
			}
		})
	})
	socket.on('disconnect', function() {
		if(socketsById[socket.lid] != undefined) {
			socketsById[socket.lid].socketList.splice(socket.offset, 1);
			if(socketsById[socket.lid].socketList.length == 0) {
				Usuario.update({ _id: socket.lid }, { $set: { state: 'offline' }}, null, function() {
					delete socketsById[socket.lid];
					socket.broadcast.emit('user-update', { id: socket.lid, username: socket.username, state: 'offline' });
					console.log('Usuario "'+ socket.username +'" desconectado de zchat.');
				});
			}
		}
	});
});
