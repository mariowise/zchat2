
var DND_Piggy = {
	data: {}
	, set: function (name, elem) {
		this.data[name] = elem
	}
	, get: function (name) {
		var tmp = this.data[name]
		delete this.data[name]
		return tmp
	}
};

/**
 * ChatWindow
*/
function chatWindow(_id, _title, _socket) {
	this.id = _id
	this.title = _title;
	this.socket = _socket;
	this.room = undefined;
	this.messages = [];
	this.domObj = undefined;
	
	this.barlist[this.id] = this;
	this.barlist.count++;
}
chatWindow.prototype.barlist = { count: 0 };

chatWindow.prototype.messageHandlers = {};

chatWindow.prototype.create = function(holder) {
	var self = this;
	var newOne = document.createElement('div');
	this.domObj = newOne;
	$(newOne).attr('name', this.id);
	$(newOne).attr('class', 'chat-window');
	$(newOne).html('<i class="fa-times"></i><div class="header">'+ this.title +'</div><div class="body"><div></div></div><div class="actions"><textarea></textarea></div>');
	// $(holder).prepend(newOne);
	$($($(newOne).children('.actions')[0]).children('textarea')[0]).keypress(function(e) {
		if(e.keyCode == 13 && !e.shiftKey) {
			e.preventDefault();
			if($(this).val() != '' && $(this).val() != '↵') {
				var msg = { to: self.id, msg: $(this).val() };
				console.log(msg);
				if(socket != undefined) {
					socket.emit('message-to', msg);
					self.pushMessage({ from: { id: socket.lid, username: socket.username}, msg: msg.msg, created: '' });
					$(this).val('');
				} else
				alert('* Error: No se ha podido enviar el mensaje');
			} else 
				$(this).val('');			
		}
	});
	$(newOne).children('.fa-times').click(function() {
		delete self.barlist[self.id];
		self.barlist.count--;
		socket.emit('close-tab', self.id);
		$(newOne).remove();
	});
	$(newOne).children('.header').click(function() {
		self.maxMini($(newOne))
	});
	$(newOne).children('.actions').find('textarea').focus(function() {
		$(newOne).attr('panic', '');
	});
	self.setDNDHandlers(newOne);
	
	if(!this.thereIsSpace($(holder))) {
		console.log("Eliminando " + $(holder).children().first().attr('name'))
		$(holder).children().first().find('.fa-times').click()
	}
	$(holder).prepend(newOne);

	socket.emit('message-get', [ this.id ]);
	socket.emit('alert-pop', this.id); // this.id = peerId
	$('[fid="'+ this.id +'"] > .alert-no')
		.html('0')
		.fadeOut(800);
	socket.emit('open-tab', this.id);

	return newOne; // Retorna el nuevo elemento creado
}
chatWindow.prototype.pushMessage = function(msg) {
	var wall = $(this.domObj).children('.body').children('div');
	var pwall = $(wall).parent();
	$(wall).html($(wall).html() + '<div class="msg'+ ((msg.from.id == socket.lid) ? ' self' : '') +'"><div class="header">'+ msg.from.username +'</div><div class="body" title="'+ msg.created.substr(11, 5) +'">'+ msg.msg +'</div></div>');
	$(pwall).animate({ scrollTop: $(wall).height() }, 0);
	$(pwall).scroll(function() {
		if($(this).scrollTop() == 0) {
			if($(this).attr('loading') != 'loading') {
				$(this).attr('loading', 'loading');
				console.log('Has llegado arriba');
								
			}
		}
	})
	return this.messages.push(msg); // Retorna el número de mensajes en la conversación
}
chatWindow.prototype.beginAlert = function() {
	var parent = $(this.domObj);
	var wind = $(this.domObj).children('.header');
	$(parent).attr('panic', 'true');
	function panic() {
		if($(parent).attr('panic') != 'true') {
			$(wind).removeClass('panic');
			return;	
		}
		if(!$(wind).hasClass('panic')) 
			$(wind).addClass('panic');
		else 
			$(wind).removeClass('panic');
		setTimeout(panic, 800);
	}
	panic();
}
chatWindow.prototype.setDNDHandlers = function (elem) {
	var self = this;

	$(elem).bind('drop', function (evnt) {
		var piggy = DND_Piggy.get('piggy')
		  , userList = $(this).attr('name').split('$$')
		  , oldUserList = [].concat(userList)
		  , stringify = ''
		
		if(userList.indexOf(piggy.fid) != -1)
			return
		if(userList.indexOf(socket.lid) == -1)
			userList.push(socket.lid)

		userList.push(piggy.fid)
		userList.sort()
		oldUserList.sort()
		
		console.log('solicitando creación de nueva sala grupal'+
			$(this).attr('name') + ' <= ' + piggy.fid)		

		socket.emit('create-group', userList)

		$(this).attr('name', userList.join('$$'))
		$(this).children('.header').append(', ' + piggy.name)

		socket.emit('rename-tab', {
			old: oldUserList.join("$$")
			, new: userList.join("$$")
		})

		// Actualizar las ventanas de los demás!
		socket.emit('update-chatWindow', {
			oldId: oldUserList.join('$$')
			, newId: userList.join('$$')
			, newHeader: $(this).children('.header').html()
		})
		
		var buff = chatWindow.prototype.barlist[self.id]
		delete chatWindow.prototype.barlist[self.id]
		self.id = userList.join('$$')
		self.title = piggy.name
		chatWindow.prototype.barlist[self.id] = buff

		console.log('Setteando objeto chatWindow')
		console.log(self)
	});
	$(elem).bind('dragover', function (evnt) {
		evnt.preventDefault()
	});
}
chatWindow.prototype.maxMini = function (dude, fast) {
	var showSpeed = (!fast) ? [400, 600] : [0, 0]
	if($(dude).attr('small') != 'true') {
		$(dude).children('.actions').slideUp(showSpeed[0]);
		$(dude).children('.body').slideUp(showSpeed[1], function() {
			$(dude).width(150);
		});
		$(dude).attr('small', 'true');
		socket.emit('update-tab', { 
			roomId: $(dude).attr('name'), 
			size:  'min'
		})
	} else {
		$(dude).width(250);
		$(dude).children('.actions').slideDown(showSpeed[0]);
		$(dude).children('.body').slideDown(showSpeed[1], function() {
			var wall = $(dude).children('.body').children('div');
			var pwall = $(wall).parent();
			$(pwall).animate({ scrollTop: $(wall).height() }, 25);
		});
		$(dude).attr('small', 'false');
		socket.emit('update-tab', { 
			roomId: $(dude).attr('name'), 
			size:  'max'
		})
	}
}
chatWindow.prototype.barlistUsedWidth = function (dude) {
	var width = 0
	$.each($(dude).children(), function (key, item) {
		width += $(item).outerWidth()
	})
	// console.log("barlistUsedWidth => "+ width)
	return width
}
chatWindow.prototype.thereIsSpace = function (holder) {
	var aviable = $(holder).width() - chatWindow.prototype.barlistUsedWidth($(holder)) - 273
	if(aviable < 273)
		return false;
	return true;
}



/**
 * ChatFriends
*/
function chatFriends(_domObj, _holdBar) {
	var self = this;
	this.state = 'close';
	this.domObj = _domObj;
	this.holdBar = _holdBar;
	this.hider = $(this.domObj).children('.hider')[0];
	
	$(this.hider).click(function() {
		if(self.state === 'open')
			self.close();
		else
			self.open();
	});

	$($(this.domObj).find('.fa-chevron-right')[0]).attr('class', 'fa-chevron-left')

	$('<audio id="new-message-sounds" controls></audio>')
		.css('display', 'none')
		.html('<source src="'+ host +':3000/img/newmessage.mp3" type="audio/mpeg"><embed height="50" width="100" src="'+ host +':3000/img/newmessage.mp3">')
		.appendTo('body')

	if($(this.domObj).find('.search').length == 0) {
		$('<div></div>')
			.addClass('search')
			.html('<i class="fa-search"></i><input type="text" placeholder="Buscar usuario"><i class="fa-times"></i>')
			.appendTo(this.domObj);
		
		var list = $(this.domObj).find('.list')[0]
		var searchInput = $(this.domObj).find('div.search > input')
		$(searchInput).keyup(function (e) {
			var query = $(searchInput).val() + String.fromCharCode(e.charCode)
			console.log('query = ' + query + ' ('+ query.length +')')
			console.log(e)
			if(query.length != 1) {				
				$(list).children().hide()
				query = query.toLowerCase()
				query = query.replace("\0", "")
				$(list).find('[lowername*="'+ query.toLowerCase() +'"]').show()
			} else
				$(list).children().show()
		})
		$(this.domObj).find('div.search > i.fa-times').click(function () {
			$(list).children().show();
			$(searchInput).val('');
		})
	}

	console.log('Construyendo chatFriends.');
}
chatFriends.prototype.open = function() {
	this.state = 'open';
	$(this.domObj).animate({
		width: '200px'
	}, 600);
	$($(this.domObj).find('.fa-chevron-left')[0]).attr('class', 'fa-chevron-right');
	socket.emit('update-chatFriends', 'opened')
}
chatFriends.prototype.close = function() {
	this.state = 'close';
	$(this.domObj).animate({
		width: '0px'
	}, 1000);
	$($(this.domObj).find('.fa-chevron-right')[0]).attr('class', 'fa-chevron-left');
	socket.emit('update-chatFriends', 'closed')
}
chatFriends.prototype.updateFriend = function(_friend) {
	var self = this;
	var friend = $(this.domObj).find('[fid="' + _friend.id + '"]')[0];
	if(friend != undefined) {
		$(friend).removeClass('online offline');
		$(friend).addClass(_friend.state);
		if(_friend.state == 'online') {
			$(friend).prependTo($('#chat-friends > .list'))
		}
		return;
	}
	var list = $(this.domObj).find('.list')[0];
	if(list != undefined) {
		var no = document.createElement('div');
		var alerts = document.createElement('div');

		$(no).addClass('chat-friend')
			.addClass(_friend.state)
			.attr('draggable', 'true')
			.attr('fid', _friend.id)	
			.attr('name', _friend.name)
			.attr('lowername', _friend.name.toLowerCase())
			.html(_friend.name)[0];

		if(_friend.state === 'online')
			$(list).prepend($(no));
		else
			$(list).append($(no));

		$(no).append($(alerts).addClass('alert-no').hide());
		$(no).click(function() {
			if(chatWindow.prototype.barlist[_friend.id] == undefined) {
				var newWindow = new chatWindow(_friend.id, _friend.name);
				newWindow.create(self.holdBar);
			}
		});
		self.setDNDHandlers(no);		
	} else
		console.log('* Error: No ha sido posible encontrar la lista de contactos');
}
chatFriends.prototype.pushAlert = function(list) {
	for(el in list) {
		if(list[el].cant != 0)
			$('[fid="'+ list[el].peerId +'"] > .alert-no')
				.html(list[el].cant)
				.show();
	}
}
chatFriends.prototype.setDNDHandlers = function (elem) {
	var self = this;

	$(elem).bind('drag', function (evnt) {
		DND_Piggy.set('piggy', {
			fid: $(this).attr('fid')
			, name: $(this).attr('name') 
		})
	})
	$(elem).bind('dragend', function (evnt) {

	})
}



/**
 * Socket.io
*/
var cf = undefined;
var socket = undefined;
function zchat(_id, _username, _secret) {
	socket = io.connect(host + ':3100');
	socket.lid = _id;
	socket.username = _username;
	socket.secret = _secret;

	socket.on('connect', function() {
		// console.log('Connecting socket.io');
		socket.emit('i-am', { id: socket.lid, username: socket.username, secret: socket.secret });
		cf = new chatFriends($('#chat-friends')[0], $('#chat-bar'));
	});
	socket.on('user-update', function(chunk) {
		// console.log('user-update');
		// console.log(chunk);
		if(chunk.id != socket.lid) {
			// console.log('Socket.io(user-update) to friend '+ chunk.id)
			cf.updateFriend({ id: chunk.id, name: chunk.username, state: chunk.state });
		}
	});
	socket.on('message-from', function(msg) {
		var fid = msg.from.id;
		var to = socket.lid;

		console.log('message-from')
		console.log(msg);
		// Chat grupal
		if(msg.from.groupData != undefined) {
			var ids = []
			for(el in msg.from.groupData)
				ids.push(msg.from.groupData[el]._id)
			ids.sort()

			var names = []
			for(el in msg.from.groupData)
				names.push(msg.from.groupData[el].username)
			names.sort()
			
			// ids.splice(ids.indexOf(socket.lid), 1)
			// names.splice(ids.indexOf(socket.username), 1)
			var auxId = ids.join('$$')

			if(chatWindow.prototype.barlist[auxId] == undefined) {
				var newWindow = new chatWindow(auxId, names.join(', '))
					newWindow.create(cf.holdBar)
			}
			chatWindow.prototype.barlist[auxId].pushMessage(msg)
			chatWindow.prototype.barlist[auxId].beginAlert()			
		// Chat individual abierto
		} else if(chatWindow.prototype.barlist[fid] != undefined) {
			chatWindow.prototype.barlist[fid].pushMessage(msg);
			chatWindow.prototype.barlist[fid].beginAlert();
		// Chat individual cerrado
		} else {
			if(chatWindow.prototype.thereIsSpace($('#chat-bar'))) {
				$('.chat-friend[fid="'+ fid +'"]').click();
				setTimeout(function() {
					if(chatWindow.prototype.barlist[fid] != undefined)
						chatWindow.prototype.barlist[fid].beginAlert();
				}, 500);
			} else {
				if(socket.lid != fid) {
					$('#new-message-sounds').trigger('play')
					socket.emit('alert-create', fid)
				}
			}
		}
		if(socket.lid != fid)
			$('#new-message-sounds').trigger('play')
	});
	socket.on('conversation-flush', function (data) {
		// console.log('conversation-flush')
		// console.log(data)
		var wind = data.peer
		if(chatWindow.prototype.barlist[wind] != undefined)
			for(var i = data.conv.length-1; i >= 0; i--) {
				chatWindow.prototype.barlist[wind].pushMessage({ 
					from: { 
						id: data.conv[i].userId, 
						username: data.conv[i].username 
					}, 
					msg: data.conv[i].message,
					created: data.conv[i].created 
				});
			}
	});
	socket.on('alerts-flush', function (data) {
		// console.log('alerts-flush');
		// console.log(data);
		chatFriends.prototype.pushAlert(data);
	});
	socket.on('open-tabs', function (data) {
		// console.log('Recieving open-tabs')
		// console.log(data)
		if(data != null) 
			$.each(data, function (key, value) {			
				$('#chat-friends .list > [fid="'+ value.roomId +'"]').click()
				if(value.size == 'min')
					chatWindow.prototype.maxMini($('#chat-bar > [name="'+ value.roomId +'"]'), true)
			})
	});
	socket.on('open-tab', function (data) {
		$('#chat-friends .list > [fid="'+ data +'"]').click();
	});
	socket.on('update-chatWindow', function (chunk) {
		var domObj = $('#chat-bar [name="'+ chunk.oldId +'"]')
		$(domObj).attr('name', chunk.newId)
		$(domObj).children('.header').html(chunk.newHeader)
	})
	socket.on('force-close-tab', function (tabId) {
		if(chatWindow.prototype.barlist[tabId]) {
			delete chatWindow.prototype.barlist[tabId];
			chatWindow.prototype.barlist.count--;
			$('#chat-bar > [name="'+ tabId +'"]').remove();
		}
	})
	socket.on('set-chatFriends', function (state) {
		if(state == 'opened') {
			$('#chat-friends').css('width', '200px')
			$($('#chat-friends').find('.fa-chevron-left')[0]).attr('class', 'fa-chevron-right')
			cf.state = 'open'
		}
	})
}
