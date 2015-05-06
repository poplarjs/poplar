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

var Entity = require('./entity');
var invokeValidations = require('./validation');


/**
 * @class A wrapper to build api methods.
 *
 * @constructor
 * Create a new `ApiMethod` with the given `options`.
 */

function ApiMethod(name, options, fn) {

  this.fn = fn;
  assert(typeof fn === 'function', 'the method must be a function');

  this.name = name;

  this._apiBuilder;

  assert(_.isString(name) && /^[a-zA-Z0-9_]+$/g.test(name), util.format('\'%s\' is not a valid name, name must be a string, \'a-z\', \'A-Z\' and _ are allowed' , name));
  assert(typeof name === 'string', 'The method name must be a string');

  options = options || {};

  this.accepts = options.accepts || [];
  this.returns = options.returns;

  this.description = options.description;
  this.accessType = options.accessType;
  this.notes = options.notes;
  this.documented = options.documented !== false;
  this.http = options.http || {};

  if (this.accepts && !Array.isArray(this.accepts)) {
    this.accepts = [this.accepts];
  }

  // check returns
  //   below types are allowed:
  //      [entity]
  //      entity
  //      'raw'
  if (this.returns) {
    if (Array.isArray(this.returns)) {
      assert(this.returns.length === 1 || Entity.isEntity(this.returns[0]), 'returns array must contains only one Entity');
    } else if (this.returns !== 'raw' && _.isFunction(this.returns)) {
      assert(Entity.isEntity(this.returns), 'returns is not a valid Entity');
    }
  } else {
    this.returns = 'raw';
  }
};

/**
 * Return method fullname: bulder name . method name
 */

ApiMethod.prototype.fullName = function() {
  assert(this._apiBuilder, 'ApiBuilder is not assigned for this method');
  return this._apiBuilder.name + '.' + this.name;
};

/**
 * set ApiBuilder
 */

ApiMethod.prototype.setApiBuilder = function(apiBuilder) {
  this._apiBuilder = apiBuilder;
};


function escapeRegex(d) {
  // see http://stackoverflow.com/a/6969486/69868
  return d.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

/**
 * Execute the api method using the given arg data.
 *
 * @param {Object} scope `this` parameter for the invocation
 * @param {Object} args containing named argument data
 * @param {Object=} options poplar object options
 * @param {Function} cb callback `fn(err, result)` containing named result data
 */

ApiMethod.prototype.invoke = function(scope, args, options, cb) {
  var accepts = this.accepts;
  var returns = this.returns;
  var errors = this.errors;
  var method = this.fn;
  var ApiMethod = this;
  var formattedArgs = {};

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
        debug('- %s - ' + e.message, ApiMethod.name);
        return cb(e);
      }
      // Add the argument even if it's undefined to stick with the accepts
      formattedArgs[name] = uarg
    }

    // Check validations
    validationErrors = invokeValidations(formattedArgs, accepts);
  }

  // define the callback
  function callback(err) {
    if (err) {
      return cb(err);
    }

    var result = ApiMethod.toResult(returns, [].slice.call(arguments, 1));

    debug('- %s - result %j', ApiMethod.name, result);

    cb(null, result);
  }

  debug('- %s - invoke with', this.name, [formattedArgs, callback]);

  // If validation failed, then return errors
  if (validationErrors.any()) {
    callback(validationErrors.asJSON());
  }

  // invoke
  try {
    var retval = method.apply(scope, [formattedArgs, callback]);
    if (retval && typeof retval.then === 'function') {
      return retval.then(
        function(args) {
          if (returns.length === 1) args = [args];
          var result = ApiMethod.toResult(returns, args);
          debug('- %s - promise result %j', ApiMethod.name, result);
          cb(null, result);
        },
        cb // error handler
      );
    }
    return retval;
  } catch (err) {
    debug('error caught during the invocation of %s', this.name);
    return cb(err);
  }
};

function badArgumentError(msg) {
  var err = new Error(msg);
  err.statusCode = 400;
  return err;
}

function escapeRegex(d) {
  // see http://stackoverflow.com/a/6969486/69868
  return d.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

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
  // TODO(bajtos) Move conversions to HttpContext (and friends)
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
      var message = util.format('invalid value for argument \'%s\' of type ' +
        '\'%s\': %s. Received type was %s. Error: %s',
        name, targetType, uarg, typeof uarg, e.message);
      throw new badArgumentError(message);
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
    var message = util.format('Invalid value for argument \'%s\' of type ' +
      '\'%s\': %s. Received type was converted to %s.',
      name, targetType, uarg, typeof uarg);
    throw new badArgumentError(message);
  }

  if (actualType === 'number' && Number.isNaN(uarg)) {
    throw new badArgumentError(name + ' must be a number');
  }

  return uarg;
}

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
}

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
}

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
 * Returns a reformatted Object valid for consumption as JSON from an Array of
 * results from a function, based on `returns`.
 */

ApiMethod.toResult = function(returns, raw) {
  var result = {};

  if (returns === 'raw' || _.isFunction(returns)) {
    return raw;
  }

  // if returns is an Array, then should return an Array
  if (Array.isArray(returns)) {
    var entity = returns[0];
    if (Array.isArray(raw)) {
      result = raw.map(function(item) {
        var parsedItem = entity.parse(item, convert);
      })
    } else {
      result = [entity.parse(raw, convert)];
    }
  }

  return result;

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
