/**
 * To run this app do this:
 *
 * $ npm install express mongoose
 * $ node app.js
 */

var express = require('express');
var util = require('util');
var poplar = require('./poplar');

var app = express();
var api = poplar();

app.disable('x-powered-by');

var Entity = require('../../lib/entity');
var ApiBuilder = requrie('../../lib/api_builder');

var UserEntity = new Entity({
  username: true,
  age: true,
  description: { as: 'selfIntroduction' },
  fullname: function(obj) {
    return util.format('%s %s', obj.firstName || '', obj.lastName || '');
  },
  isAdult: function(obj) {
    return obj.age >= 18 ? true : false;
  },
  hasCreditCard: function(obj) {
    return obj.creditCard ? true : false;
  },
  nation: { value: 'China' },
  gender: { default: 'unknown' }
});

var UserApi = new ApiBuilder({
  basicPath: '/u'
});

UserApi.define('info', {
  accepts: [
    { arg: 'id', type: 'integer', validates: { require: true }, description: 'Get Username' }
  ],
  http: { path: 'info', verb: 'get' },
  returns: UserEntity
}, function(params, cb) {
  return {
    username: 'Felix Liu',
    age: 25,
    description: 'A programer who lives in Shanghai',
    firstName: 'Felix',
    lastName: 'Liu',
    creditCard: 88888888888888,
    gender: 'male'
  };
});

api.define('users', UserApi);

app.use(api.handler('rest'));
app.use(express.static('public'));

app.listen(3000);
