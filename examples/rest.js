/**
 * To run this app do this:
 *
 * $ npm install express mongoose
 * $ node app.js
 */

var express = require('express');
var util = require('util');


var poplar = require('./../');

var app = express();

var apiV1 = poplar.create();
var apiV2 = poplar.create();

app.disable('x-powered-by');

var Entity = poplar.Entity;
var ApiBuilder = poplar.ApiBuilder;

// 用户接口数据返回
var UserEntity = new Entity({
  username: true,
  age: true,
  description: { as: 'introduction' },
  nation: { value: 'China' },
  gender: { default: 'unknown' },
  fullname: function(obj) {
    return util.format('%s %s', obj.firstName || '', obj.lastName || '');
  },
  isAdult: function(obj) {
    return obj.age >= 18 ? true : false;
  },
  hasCreditCard: function(obj) {
    return obj.creditCard ? true : false;
  }
});

var UserApi = new ApiBuilder('users', {
  basePath: '/users'
});

UserApi.define('info', {
  accepts: [
    {
      arg: 'id',
      type: 'number',
      validates: {
        require: { message: 'id can\'t be empty' },
        isInt: { message: 'id must be a integer' },
        largerThan20: function(val) {
          if (val <= 20) {
            return 'id must be large than 20';
          }
        }
      },
      description: 'Get Username'
    }
  ],
  http: { path: 'info', verb: 'get' },
  presenter: UserEntity,
  returns: function(ctx, cb) {
    ctx.res.send({
      data: ctx.result
    });
    cb();
  }
}, function(params, cb) {
  cb(null, {
    username: 'Felix Liu',
    age: 25,
    description: 'A programer who lives in Shanghai',
    firstName: 'Felix',
    lastName: 'Liu',
    creditCard: 88888888888888,
    gender: 'male'
  });
});

UserApi.before('*', function(ctx, next) {
  console.log('before.users.* called');
  next();
});

UserApi.before('info', function(ctx, next) {
  console.log('before.users.info called');
  next();
});

UserApi.after('info', function(ctx, next) {
  console.log('after.users.info called');
  next();
});

apiV1.use(UserApi);

var UserApiV2 = new ApiBuilder();

UserApiV2.extend(UserApi);

apiV2.use(UserApiV2);

var errorHandler = function(err, req, res, next) {
  if (err) {
    err.validations = err.validations || {};
    if (err.validations.errors) {
      res.statusCode = 422;
    } else {
      res.statusCode = 500;
    }
    res.send({
      status: res.statusCode,
      message: err.validations.message || err.message || 'An unknown error occurred',
      errors: err.validations.errors || err.stack
    });
  } else {
    next();
  }
};

app.use('/api/v1', apiV1.handler('rest', { errorHandler: errorHandler }));
app.use('/api/v2', apiV2.handler('rest', { errorHandler: errorHandler }));

app.use(express.static('public'));

app.listen(3000);
