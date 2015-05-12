/*!
 * Expose `ApiMethod`.
 */
module.exports = ApiMethod;

/*!
 * Module dependencies.
 */
var debug = require('debug')('poplar:api-method');
var util = require('util');
var inherits = util.inherits;
var assert = require('assert');
var traverse = require('traverse');
var _ = require('lodash');
var Path = require('path');

var Entity = require('./entity');
var invokeValidations = require('./validation');


/**
 * @class A wrapper to build api methods.
 *
 * @constructor
 * Create a new `ApiMethod` with the given `options`.
 */
function ApiMethod(name, options, fn) {

  this.__original = [name, options, fn];

  this.fn = fn;
  assert(typeof fn === 'function', 'the method must be a function');

  this.name = name;

  this._apiBuilder;

  assert(_.isString(name) && /^[a-zA-Z0-9_]+$/g.test(name), util.format('\'%s\' is not a valid name, name must be a string, \'a-z\', \'A-Z\' and _ are allowed' , name));

  options = options || {};

  this.accepts = options.accepts || [];
  this.returns = options.returns;

  this.description = options.description;
  this.accessType = options.accessType;
  this.notes = options.notes;
  this.documented = options.documented !== false;
  this.http = options.http || {};

  assert(_.isPlainObject(this.http), util.format('Invalid http options for method \'%s\'', this.name));

  if (this.accepts && !Array.isArray(this.accepts)) {
    this.accepts = [this.accepts];
  }

  this.presenter = options.presenter;
  if (this.presenter) {
    assert(Entity.isEntity(this.presenter), 'presenter must be a valid Entity');
  }
};

/*!
 * Simplified APIs
 */
ApiMethod.create = function(name, options, fn) {
  return new ApiMethod(name, options, fn);
};

/*
 * Clone a clean method from self
 */
ApiMethod.prototype.clone = function() {
  return ApiMethod.create.apply(ApiMethod, this.__original);
};

/**
 * Return method fullname: bulder name . method name
 */
ApiMethod.prototype.fullName = function() {
  assert(this._apiBuilder, 'ApiBuilder is not assigned for this method');
  return util.format('%s.%s', this._apiBuilder.name, this.name);
};

/**
 * Return method fullPath: bulder basePath + method http path
 */
ApiMethod.prototype.fullPath = function() {
  assert(this._apiBuilder, 'ApiBuilder is not assigned for this method');
  return Path.join('/', this._apiBuilder.options.basePath, this.http.path || '/');
};

/**
 * set ApiBuilder
 */
ApiMethod.prototype.setApiBuilder = function(apiBuilder) {
  this._apiBuilder = apiBuilder;
};

/**
 * excape RegExp string
 */
function escapeRegex(d) {
  // see http://stackoverflow.com/a/6969486/69868
  return d.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

/**
 * Execute the api method using the given arg data.
 *
 * @param {Object} args containing named argument data
 * @param {Object=} options poplar object options
 * @param {Function} cb callback `fn(err, result)` containing named result data
 */
ApiMethod.prototype.invoke = function(ctx, cb) {
  var args = ctx.args;
  var options = ctx.options;

  var returns = this.returns;
  var accepts = this.accepts;
  var errors = this.errors;
  var method = this.fn;
  var presenter = this.presenter;
  var formattedArgs = {};
  var self = this;

  var validationErrors;

  if (cb === undefined && typeof options === 'function') {
    cb = options;
    options = {};
  }

  // map the given arg data in order they are expected in
  if (accepts) {
    for (var i = 0; i < accepts.length; i++) {
      var desc = accepts[i];
      var name = desc.name || desc.arg;
      var uarg = ApiMethod.convertArg(desc, args[name]);

      try {
        uarg = coerceAccepts(uarg, desc, name);
      } catch (e) {
        debug('- %s - ' + e.message, self.fullName());
        return cb(e);
      }
      // Add the argument even if it's undefined to stick with the accepts
      formattedArgs[name] = uarg;
    }

    // Check validations
    validationErrors = invokeValidations(formattedArgs, accepts);
  }

  // define the callback
  function callback(err) {
    if (err) {
      return cb(err);
    }

    var result = ApiMethod.toResult([].slice.call(arguments, 1)[0], presenter, options);

    debug('- %s - result', self.fullName(), result);

    if (_.isFunction(returns)) {
      ctx.result = result;
      ctx._done = true; // mark ctx is finished, because the res will be handled by user
      returns.call(self, ctx, cb);
      return;
    } else {
      cb(null, result);
    }
  }

  // If validation failed, then return errors
  if (validationErrors && validationErrors.any()) {
    return callback({
      validations: {
        message: validationErrors.toHuman(),
        errors: validationErrors.asJSON()
      }
    });
  }

  debug('- %s - invoke with', self.fullName(), [formattedArgs, callback]);

  // invoke
  try {
    var retval = method.apply(self, [formattedArgs, callback]);
    if (retval && typeof retval.then === 'function') {
      return retval.then(
        function(args) {
          callback(null, args);
        },
        callback // error handler
      );
    }
    return retval;
  } catch (err) {
    debug('error caught during the invocation of %s', self.fullName());
    return cb(err);
  }
};

/**
 * Bad Argument Error
 */
function badArgumentError(msg) {
  var err = new Error(msg);
  err.statusCode = 400;
  return err;
};

/**
 * Coerce an 'accepts' value into its final type.
 * If using HTTP, some coercion is already done in http-context.
 *
 * This should only do very simple coercion.
 *
 * @param  {*} uarg            Argument value.
 * @param  {Object} desc       Argument description.
 * @return {*}                 Coerced argument.
 */
function coerceAccepts(uarg, desc) {
  var name = desc.name || desc.arg;
  var targetType = convertToBasicType(desc.type);
  var targetTypeIsArray = Array.isArray(targetType) && targetType.length === 1;

  // If coercing an array to an erray,
  // then coerce all members of the array too
  if (targetTypeIsArray && Array.isArray(uarg)) {
    return uarg.map(function(arg, ix) {
      // when coercing array items, use only name and type,
      // ignore all other root settings like "required"
      return coerceAccepts(arg, {
        name: name + '[' + ix + ']',
        type: desc.type[0]
      });
    });
  }

  var actualType = ApiMethod.getType(uarg);

  // convert values to the correct type
  // TODO Move conversions to HttpContext (and friends)
  // ApiMethod should only check that argument values match argument types.
  var conversionNeeded = targetType !== 'any' &&
    actualType !== 'undefined' &&
    actualType !== targetType;

  if (conversionNeeded) {
    // JSON.parse can throw, so catch this error.
    try {
      uarg = convertValueToTargetType(name, uarg, targetType);
      actualType = ApiMethod.getType(uarg);
    } catch (e) {
      debug('invalid value for argument \'%s\' of type ' +
        '\'%s\': %s. Received type was %s. Error: %s',
        name, targetType, uarg, typeof uarg, e.message);
      // TODO: better way to treat bad value
      // throw new badArgumentError(message);
      return uarg;
    }
  }

  var typeMismatch = targetType !== 'any' &&
    actualType !== 'undefined' &&
    targetType !== actualType &&
    // In JavaScript, an array is an object too (typeof [] === 'object').
    // However, ApiMethod.getType([]) returns 'array' instead of 'object'.
    // We must explicitly allow assignment of an array value to an argument
    // of type 'object'.
    !(targetType === 'object' && actualType === 'array');

  if (typeMismatch) {
    debug('Invalid value for argument \'%s\' of type ' +
      '\'%s\': %s. Received type was converted to %s.',
      name, targetType, uarg, typeof uarg);
    // TODO: better way to treat bad value
    // throw new badArgumentError(message);
    return uarg;
  }

  if (actualType === 'number' && Number.isNaN(uarg)) {
    return uarg;
    // TODO: better way to treat bad value
    // throw new badArgumentError(name + ' must be a number');
  }

  return uarg;
};

/**
 * Returns an appropriate type based on a type specifier from
 * metadata.
 * @param {Object} type A type specifier from metadata,
 *    e.g. "[Number]" or "MyModel" from `accepts[0].type`.
 * @returns {String} A type name compatible with the values returned by
 *   `ApiMethod.getType()`, e.g. "string" or "array".
 */
function convertToBasicType(type) {
  if (Array.isArray(type)) {
    return type.map(convertToBasicType);
  }

  if (typeof type === 'object') {
    type = type.modelName || type.name;
  }

  type = String(type).toLowerCase();
  switch (type) {
    case 'string':
    case 'number':
    case 'date':
    case 'boolean':
    case 'buffer':
    case 'object':
    case 'any':
      return type;
    default:
      // custom types like MyModel
      return 'object';
  }
};

/**
 * convert a value to target type
 */
function convertValueToTargetType(argName, value, targetType) {
  switch (targetType) {
    case 'string':
      return String(value).valueOf();
    case 'date':
      return new Date(value);
    case 'number':
      return Number(value).valueOf();
    case 'boolean':
      return Boolean(value).valueOf();
    // Other types such as 'object', 'array',
    // ModelClass, ['string'], or [ModelClass]
    default:
      switch (typeof value) {
        case 'string':
          return JSON.parse(value);
        case 'object':
          return value;
        default:
          throw new badArgumentError(argName + ' must be ' + targetType);
      }
  }
};

/**
 * Returns an appropriate type based on `val`.
 * @param {*} val The value to determine the type for
 * @returns {String} The type name
 */
ApiMethod.getType = function(val) {
  var type = typeof val;

  switch (type) {
    case 'undefined':
    case 'boolean':
    case 'number':
    case 'function':
    case 'string':
      return type;
    case 'object':
      // null
      if (val === null) {
        return 'null';
      }

      // buffer
      if (Buffer.isBuffer(val)) {
        return 'buffer';
      }

      // array
      if (Array.isArray(val)) {
        return 'array';
      }

      // date
      if (val instanceof Date) {
        return 'date';
      }

      // object
      return 'object';
  }
};

/**
 * Returns a reformatted Object valid for consumption as function
 * arguments
 */
ApiMethod.convertArg = function(accept, raw) {
  if (accept.http && (accept.http.source === 'req' ||
    accept.http.source === 'res' ||
    accept.http.source === 'context'
    )) {
    return raw;
  }
  if (raw === null || typeof raw !== 'object') {
    return raw;
  }
  var data = traverse(raw).forEach(function(x) {
    if (x === null || typeof x !== 'object') {
      return x;
    }
    var result = x;
    if (x.$type === 'base64' || x.$type === 'date') {
      switch (x.$type) {
        case 'base64':
          result = new Buffer(x.$data, 'base64');
          break;
        case 'date':
          result = new Date(x.$data);
          break;
      }
      this.update(result);
    }
    return result;
  });
  return data;
};

/**
 * Returns a reformatted Object valid for consumption as JSON
 */
ApiMethod.toResult = function(raw, presenter, options) {
  if (Entity.isEntity(presenter)) {
    return presenter.parse(raw, options, convert);
  } else {
    return raw;
  }

  function convert(val) {
    switch (ApiMethod.getType(val)) {
      case 'date':
        return {
          $type: 'date',
          $data: val.toString()
        };
      case 'buffer':
        return {
          $type: 'base64',
          $data: val.toString('base64')
        };
    }

    return val;
  }
};
