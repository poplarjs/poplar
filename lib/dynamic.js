/**
 * Expose `Dynamic`.
 */
module.exports = Dynamic;

/*!
 * Module dependencies.
 */
var debug = require('debug')('poplar:dynamic');
var _ = require('lodash');
var assert = require('assert');

/**
 * @class
 * Create a dynamic value from the given value.
 *
 * @param {*} val The value object
 * @param {Context} ctx The Context
 */
function Dynamic(val, ctx) {
  this.val = val;
  this.ctx = ctx;
}

/*!
 * Object containing converter functions.
 */
Dynamic.converters = {};

/**
 * Define a named type conversion. The conversion is used when a
 * `ApiMethod` argument defines a type with the given `name`.
 *
 * ```js
 * Dynamic.define('MyType', function(val, ctx) {
 *   // use the val and ctx objects to return the concrete value
 *   return new MyType(val);
 * });
 * ```
 *
 * @param {String} name The type name
 * @param {Function} converter
 */
Dynamic.define = function(name, converter) {
  this.converters[name] = converter;
};

/**
 * undefine a converter via its name
 */
Dynamic.undefine = function(name) {
  delete this.converters[name];
};

/**
 * Is the given type supported.
 *
 * @param {String} type
 * @returns {Boolean}
 */
Dynamic.canConvert = function(type) {
  return !!this.getConverter(type);
};

/**
 * Get converter by type name.
 *
 * @param {String} type
 * @returns {Function}
 */
Dynamic.getConverter = function(type) {
  return this.converters[type];
};

/**
 * Shortcut method for convert value
 *
 * @param {String} val
 * @param {String} type
 * @param {Object} ctx
 * @returns {Object}
 */
Dynamic.convert = function(val, toType, ctx) {
  if (Array.isArray(toType)) {
    if (!Array.isArray(val)) {
      if (val === undefined || val === '') {
        val = [];
      } else {
        val = [val];
      }
    }

    return Dynamic.convert(val, toType[0], ctx);
  }

  if (Array.isArray(val)) {
    return _.map(val, function(v) {
      return Dynamic.convert(v, toType, ctx);
    });
  }
  return (new Dynamic(val, ctx)).to(toType);
};

/**
 * Convert the dynamic value to the given type.
 *
 * @param {String} type
 * @returns {*} The concrete value
 */
Dynamic.prototype.to = function(type) {
  var converter = this.constructor.getConverter(type);
  assert(converter, 'No Type converter defined for ' + type);
  return converter(this.val, this.ctx);
};

/**
 * Built in type converters...
 *   number
 *   date
 *   string
 *   boolean
 *   any
 */

Dynamic.define('number', function convertNumber(val) {
  if (val === 0) return val;
  if (!val) return val;
  return Number(val);
});

Dynamic.define('date', function convertDate(val) {
  if (val instanceof Date) return val;
  if (!val) return val;
  return new Date(val);
});

Dynamic.define('string', function convertString(val) {
  if (typeof val === 'string') return val;
  if (!val) return val;
  return String(val);
});

Dynamic.define('boolean', function convertBoolean(val) {
  switch (typeof val) {
    case 'string':
      switch (val) {
        case 'false':
        case 'undefined':
        case 'null':
        case '0':
        case '':
          return false;
        default:
          return true;
      }
      break;
    case 'number':
      return val !== 0;
    default:
      return Boolean(val);
  }
});

Dynamic.define('any', function convertAny(val) {
  return val;
});
