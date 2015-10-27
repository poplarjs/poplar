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
var _ = require('lodash');
var Path = require('path');
var onFinished = require('on-finished');
var pathToRegexp = require('path-to-regexp');

var Entity = require('./entity');
var invokeValidations = require('./validation');
var invokeSantizers = require('./sanitizer');


/**
 * @class A wrapper to build api methods.
 *
 */
function ApiMethod(name, options, fn) {

  this.__original = [name, options, fn];

  this.fn = fn;
  assert(typeof fn === 'function', 'the method must be a function');

  // if method accept a callback(restrict mode) or not
  this.isRestrictMode = fn.length === 1 ? false : true;

  this.name = name;

  this._apiBuilder = null;

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

  // if accepts is not a array, then wrap it as an array
  if (this.accepts && !_.isArray(this.accepts)) {
    this.accepts = [this.accepts];
  }

  this.presenter = options.presenter;
  if (this.presenter) {
    assert(Entity.isEntity(this.presenter), 'presenter must be a valid Entity');
  }

  this.presenterSource = options.presenterSource;
  if (this.presenterSource) {
    assert(_.isString(this.presenterSource), 'presenterSource must be a valid string');
  }
}

/*!
 * Simplified APIs
 */
ApiMethod.create = function(name, options, fn) {
  return new ApiMethod(name, options, fn);
};

/*!
 * Create a MethodInvocation instance for invoking
 */
ApiMethod.prototype.createMethodInvocation = function() {
  return new MethodInvocation(this).init();
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
  return Path.join('/', this._apiBuilder.options.basePath, this.http.path || '');
};

/**
 * Stringifies the query into the pathname, using the apiMethod's http config
 */
ApiMethod.prototype.makeHref = function(query) {
  query = query || {};
  if (!this._toPath) this._toPath = pathToRegexp.compile(this.fullPath());
  return this._toPath(query);
};

/**
 * set ApiBuilder
 */
ApiMethod.prototype.setApiBuilder = function(apiBuilder) {
  this._apiBuilder = apiBuilder;
};

/**
 * Sanitize arguments
 *
 * @param {Object} args containing named argument data
 * @param {Function} cb callback `fn(err, result)` containing named result data
 */
ApiMethod.prototype.sanitize = function(args, cb) {
  var accepts = this.accepts;
  var sanitizedArgs = invokeSantizers(args, accepts);
  if (cb && typeof cb === 'function') {
    cb(null, sanitizedArgs);
  } else {
    return sanitizedArgs;
  }
};

/**
 * Validate arguments
 *
 * @param {Object} args containing named argument data
 * @param {Function} cb callback `fn(err, result)` containing named result data
 */
ApiMethod.prototype.validate = function(args, cb) {
  var accepts = this.accepts;
  var validationErrors = invokeValidations(args, accepts);
  if (cb && typeof cb === 'function') {
    if (validationErrors.any()) {
      cb(validationErrors);
    } else {
      cb();
    }
  } else {
    return validationErrors;
  }
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
  var options = util._extend({}, ctx.options);

  var returns = this.returns;
  var accepts = this.accepts;
  var errors = this.errors;
  var method = this.fn;
  var presenter = this.presenter;
  var presenterSource = this.presenterSource;
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
      var uarg = args[name];

      try {
        uarg = coerceAccepts(uarg, desc, name);
      } catch (e) {
        debug('- %s - ' + e.message, self.fullName());
        return cb(e);
      }
      // Add the argument even if it's undefined to stick with the accepts
      formattedArgs[name] = uarg;
    }

    // Sanitize args
    if (self.isSanitized === false) {
      formattedArgs = self.sanitize(formattedArgs);
      self.isSanitized = true;
    }

    // Check validations
    if (self.isValidated === false) {
      validationErrors = self.validate(formattedArgs);
      self.isValidated = true;
    }
  }

  options.args = formattedArgs;

  // define the callback
  function callback(err) {
    if (err) {
      return cb(err);
    }

    var result = ApiMethod.toResult([].slice.call(arguments, 1)[0], presenter, presenterSource, options);
    ctx.result = result;

    debug('- %s - result', self.fullName(), result);

    if (_.isFunction(returns)) {
      returns.call(self, ctx, cb);
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

  if (self.isRestrictMode) {
    // invoke
    try {
      var retval = method.call(self, formattedArgs, callback);
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
      return callback(err);
    }
  } else {
    self.ctx = ctx;
    self.ctx._done = true;

    onFinished(ctx.res, function(err) {
      if (err) return cb(err);
      cb();
    });

    try {
      method.call(self, formattedArgs);
    } catch (e) {
      debug('error caught during the invocation of %s', self.fullName());
      return cb(e);
    }
  }
};

/*!
 * Bad Argument Error
 */
function badArgumentError(msg) {
  var err = new Error(msg);
  err.statusCode = 400;
  return err;
}

/*!
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
  var targetTypeIsArray = _.isArray(targetType) && targetType.length === 1;

  // If coercing an array to an erray,
  // then coerce all members of the array too
  if (targetTypeIsArray && _.isArray(uarg)) {
    return _.map(uarg, function(arg, ix) {
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
}

/*!
 * Returns an appropriate type based on a type specifier from
 * metadata.
 * @param {Object} type A type specifier from metadata,
 *    e.g. "[Number]" or "MyModel" from `accepts[0].type`.
 * @returns {String} A type name compatible with the values returned by
 *   `ApiMethod.getType()`, e.g. "string" or "array".
 */
function convertToBasicType(type) {
  if (_.isArray(type)) {
    return _.map(type, convertToBasicType);
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

/*!
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
      if (_.isArray(val)) {
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
 * Returns a reformatted Object valid for consumption as JSON
 */
ApiMethod.toResult = function(raw, presenter, presenterSource, options) {
  if (Entity.isEntity(presenter)) {
    var result = presenter.parse(_eval(raw, presenterSource), options, _convert);
    return _eval(raw, presenterSource, result);
  } else {
    return raw;
  }

  function coerceValue(input) {
    // if input value can be converted to number, then return number
    // if input value is a string, then remove its extra \' or "
    // else return it directly
    if (isNaN(input)) {
      if (_.isString(input)) {
        return input.replace(/(^(\'|\")|(\'|\")$)/g, '');
      }
    } else {
      return Number(input).valueOf();
    }
    return input;
  }

  // extract or insert data in to source
  function _eval(source, path, value) {
    if (path && _.isString(path)) {

      // split path by '[', '.', ']' and then remove empty string
      var list = _.compact(path.trim().split(/\[|\.|\]/));
      var result = source;

      // if value exists, assign the value to specific path
      // else return the value of specific path
      if (value) {
        _.each(list, function(el, i) {
          // if result is not exists, then go next
          if (!result) {
            result = undefined;
            return;
          }

          // if the `list` has been iterated to the end, then assign the value
          // else parse the next child path in `list`
          if (list.length === i + 1) {
            result[coerceValue(el)] = value;
          } else {
            result = result[coerceValue(el)];
          }
        });
        return source;
      } else {
        _.each(list, function(el) {
          if (!result) {
            result = undefined;
            return;
          } else {
            result = result[coerceValue(el)];
          }
        });
        return result;
      }
    } else {
      if (value) return value;
      return source;
    }
  }

  function _convert(val) {
    switch (ApiMethod.getType(val)) {
      case 'date':
        return val.toString();
      case 'buffer':
        return val.toString('utf-8');
    }

    return val;
  }
};

/*!
 * Attributes that should be copy to MethodInvocation from ApiMethod
 */
var METHOD_INVOCATION_ATTRIBUTES = [
  '__original',
  'fn',
  'isRestrictMode',
  'name',
  '_apiBuilder',
  'accepts',
  'returns',
  'presenter',
  'presenterSource',
  'description',
  'http'
];

/**
 * Method for invocation, used to generate ApiMethod mirror instance for executing during each request
 * @class
 *
 * @param {Object} apiMethod ApiMethod instance
 */
function MethodInvocation(apiMethod) {
  var self = this;

  _.each(METHOD_INVOCATION_ATTRIBUTES, function(name) {
    self[name] = apiMethod[name];
  });

  // locals used by `set` and `get` during method invocation
  this.locals = {};
}

/*!
 * Inherit from `ApiMethod`.
 */
inherits(MethodInvocation, ApiMethod);

/**
 * method invocation statuses
 */
MethodInvocation.prototype.init = function() {
  this.isSanitized = false;
  this.isValidated = false;

  return this;
};

/**
 * Set a local variable for MethodInvocation instance
 * @param {String} name local variable name
 * @param {*} obj local variable value
 */
MethodInvocation.prototype.set = function(name, obj) {
  this.locals[name] = obj;
};

/**
 * Get a local variable from MethodInvocation instance
 * @param {String} name local variable name
 */
MethodInvocation.prototype.get = function(name) {
  return this.locals[name];
};
