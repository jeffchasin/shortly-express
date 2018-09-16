var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

// var salt = bcrypt.genSaltSync(10);
// var hash = bcrypt.hashSync(password, salt);

var User = db.Model.extend({
  tableName: 'users'
});

module.exports = User;