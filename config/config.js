
var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
    development: {
        db: 'mongodb://localhost/zchat2',
        root: rootPath,
        app: {
            name: 'ZChat'
        },
        "socket.io": {
            port: 3100
        }
    },
    production: {
        db:'',
        root: '',
        app: {
            name:''
        },
    }
}