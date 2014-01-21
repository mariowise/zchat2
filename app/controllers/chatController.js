
var opt = {
	url_base: '/users',
	index: 'chat/index.html'
}

// Module dependencies
var mongoose = require('mongoose'),
	_ = require('underscore');

/**
 * Index
 */
exports.index = function(req, res) {

	res.render(opt.index, {
		title: 'ChatController.index'
	});

}