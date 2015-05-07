/*!
 * Expose `ApiBuilder`.
 */

module.exports = ApiBuilder;

/*!
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('poplar:api-builder');
var util = require('util');
var inherits = util.inherits;
var assert = require('assert');
var _ = require('lodash');

var Poplar = require('./poplar');
var ApiMethod = require('./api_method');

/**
 * @class A wrapper to build apis.
 *
 * @constructor
 * Create a new `ApiBuilder` with the given `options`.
 */

function ApiBuilder(name, options) {
  this.name = name;
  assert(_.isString(name) && /^[a-zA-Z0-9_]+$/g.test(name), util.format('\'%s\' is not a valid name, name must be a string, \'a-z\', \'A-Z\' and _ are allowed' , name));
  this._methods = {};

  // Options:
  //   basePath: '/'
  this.options = options || {};
  assert(_.isPlainObject(this.options), util.format('Invalid options for ApiBuilder \'%s\'', this.name));

  this.options.basePath = this.options.basePath || this.name;
};

/*!
 * Inherit from `EventEmitter`.
 */

inherits(ApiBuilder, EventEmitter);

/**
 * Get method by name
 *
 * @param {String} name: method name
 * @param {Object} options: method options
 * @param {Function} fn: method function
 */

ApiBuilder.prototype.define = function(name, options, fn) {
  var self = this;

  if (name instanceof ApiMethod && _.isUndefined(options) && _.isUndefined(fn)) {
    checkMethodExistance(name.name);
    name.setApiBuilder(this);
    // if name is a ApiMethod instance, then add it directly
    this._methods[name.name] = name;
  } else {
    checkMethodExistance(name);
    // create a new ApiMethod
    var method = new ApiMethod(name, options, fn);
    method.setApiBuilder(this);
    this._methods[name] = method;
  }

  function checkMethodExistance(methodName) {
    if (self._methods[methodName]) {
      assert(!self._methods[methodName], util.format('Method \'%s\' has already been defined for ApiBuilder \'%s\'', methodName, self.name));
    }
  };
};

/**
 * Get method by name
 *
 * @param {String} name: method name
 */

ApiBuilder.prototype.method = function(name) {
  return this._methods[name];
};

/**
 * Get all methods
 */

ApiBuilder.prototype.methods = function() {
  return this._methods || {};
};


/**
 * Execute the given function before the matched method string.
 *
 * **Examples:**
 *
 * ```js
 * // Do something before our `user.greet` example, earlier.
 * api.before('user.greet', function(ctx, next) {
 *   if ((ctx.req.param('password') || '').toString() !== '1234') {
 *     next(new Error('Bad password!'));
 *   } else {
 *     next();
 *   }
 * });
 *
 * // Do something before any `user` method.
 * api.before('user.*', function(ctx, next) {
 *   console.log('Calling a user method.');
 *   next();
 * });
 *
 * // Do something before a `dog` instance method.
 * api.before('dog.*', function(ctx, next) {
 *   var dog = this;
 *   console.log('Calling a method on "%s".', dog.name);
 *   next();
 * });
 * ```
 *
 * @param {String} methodMatch The glob to match a method string
 * @callback {Function} hook
 * @param {Context} ctx The adapter specific context
 * @param {Function} next Call with an optional error object
 * @param {ApiMethod} method The ApiMethod object
 */

ApiBuilder.prototype.before = function(methodMatch, fn) {
  var type = util.format('before.%s.%s', this.name, methodMatch);
  this.on(type, fn);
};

/**
 * Execute the given `hook` function after the matched method string.
 *
 * **Examples:**
 *
 * ```js
 * // Do something after the `speak` instance method.
 * // NOTE: you cannot cancel a method after it has been called.
 * api.after('dog.speak', function(ctx, next) {
 *   console.log('After speak!');
 *   next();
 * });
 *
 * // Do something before all methods.
 * api.before('**', function(ctx, next, method) {
 *   console.log('Calling:', method.name);
 *   next();
 * });
 *
 * // Modify all returned values named `result`.
 * api.after('**', function(ctx, next) {
 *   ctx.result += '!!!';
 *   next();
 * });
 * ```
 *
 * @param {String} methodMatch The glob to match a method string
 * @callback {Function} hook
 * @param {Context} ctx The adapter specific context
 * @param {Function} next Call with an optional error object
 * @param {ApiMethod} method The ApiMethod object
 */

ApiBuilder.prototype.after = function(methodMatch, fn) {
  var type = util.format('after.%s.%s', this.name, methodMatch);
  this.on(type, fn);
};

/**
 * Execute the given `hook` function after the method matched by the method
 * string failed.
 *
 * **Examples:**
 *
 * ```js
 * // Do something after the `speak` instance method failed.
 * api.afterError('dog.speak', function(ctx, next) {
 *   console.log('Cannot speak!', ctx.error);
 *   next();
 * });
 *
 * // Do something before all methods.
 * api.afterError('**', function(ctx, next, method) {
 *   console.log('Failed', method.name, ctx.error);
 *   next();
 * });
 *
 * // Modify all returned errors
 * api.after('**', function(ctx, next) {
 *   if (!ctx.error.details) ctx.result.details = {};
 *   ctx.error.details.info = 'intercepted by a hook';
 *   next();
 * });
 *
 * // Report a different error
 * api.after('dog.speak', function(ctx, next) {
 *   console.error(ctx.error);
 *   next(new Error('See server console log for details.'));
 * });
 * ```
 *
 * @param {String} methodMatch The glob to match a method string
 * @callback {Function} hook
 * @param {Context} ctx The adapter specific context
 * @param {Function} next Call with an optional error object
 * @param {ApiMethod} method The ApiMethod object
 */

ApiBuilder.prototype.afterError = function(methodMatch, fn) {
  var type = util.format('afterError.%s.%s', this.name, methodMatch);
  this.on(type, fn);
};
