
module.exports = function(app, passport) {

	/*

    Según la documentación de ruby on rails:

    Verb    Path                 action   used for

    GET     /photos              index    display a list of all photos
    GET     /photos/new          new      return an HTML form for creating a new photo
    POST    /photos              create   create a new photo
    GET     /photos/:id          show     display a specific photo
    GET     /photos/:id/edit     edit     return an HTML form for editing a photo
    PUT     /photos/:id          update   update a specific photo
    DELETE  /photos/:id          destroy  delete a specific photo
    */

    // Controllers
    var indexController = require('../app/controllers/indexController');
    var chatController = require('../app/controllers/chatController');

    // Index
    app.get('/', indexController.index);

    // Chat
    app.get('/chat', chatController.index);

}