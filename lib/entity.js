/*!
 * Expose `Entity`.
 */

module.exports = Entity;

/*!
 * Module dependencies.
 */

var util = require('util');
var debug = require('debug')('poplar:entity');
var inherits = util.inherits;
var _ = require('lodash');
var assert = require('assert');

var helper = require('./helper');

/**
 * @class A wrapper to map returns with input value.
 *
 * @constructor
 * Create a new `Entity` with the given `options`.
 */

function Entity(definitions) {
  this._mappings = {};
  this._keys = [];

  var self = this;

  if (_.isPlainObject(definitions)) {
    _.each(definitions, function(fn, name) {
      self.add(name, fn);
    })
  } else if (!_.isUndefined(definitions)) {
    assert(false, util.format('\'%s\' is not a valid object', definitions));
  }
};

/**
 * check whether an object is an Entity instance
 */
Entity.isEntity = function(entity) {
  return !!(entity && _.isFunction(entity.isEntity) && this.prototype.isEntity.call(entity));
}

/**
 * add a given name with or without corresponding function or value
 * { type: 'alias', value: 'name', default: null }
 * type:
 *    function
 *    alias
 *    value
 * Usage:
 *    var entity = new Entity();
 *    entity.add('name');
 *    entity.add('name', { as: 'fullname' });
 *    entity.add('sex', { value: 'male' });
 *    entity.add('isAdult', function(obj) { return obj && obj.age >= 18; });
 */
Entity.prototype.add = function(name, fn) {

  var message = '\'%s\' is not a valid string';

  var val = null,
      defaultVal = null,
      type = null;

  if (_.isString(name)) {
    if (_.isFunction(fn)) {
      type = 'function';
      val = fn;
    } else if (_.isPlainObject(fn)) {

      if (fn.hasOwnProperty('default')) {
        defaultVal = _.isUndefined(fn['default']) ? null : fn['default'];
      }

      if (fn['as']) {
        if (!_.isString(fn['as'])) throw(new Error(util.format(message, fn['as'])));
        type = 'alias';
        val = name;
        name = fn['as'];
      } else if (fn['value']) {
        type = 'value';
        val = fn['value'];
      } else {
        type = 'alias';
        val = name;
      }

    } else if (_.isUndefined(fn) || fn === true) {
      // if fn is undefined, then treat name as alias the same name for input
      type = 'alias';
      val = name;
    } else {
      // take other as value, such as number, array
      type = 'value';
      val = fn;
    }

    this._mappings[name] = { type: type, value: val, default: defaultVal };

    // always get all keys after add a new field
    this._keys = Object.keys(this._mappings);
  } else {
    throw(new Error(util.format(message, name)));
  }
};

/**
 * parse a input object with mappings
 * @param {Object} input: input object values
 * @param {Function} converter: value converter, which can accept one parameter
 */

Entity.prototype.parse = function(input, converter) {
  var originalObj;
  var result = {};
  var self = this;
  if (_.isUndefined(input) || _.isNull(input)) {
    originalObj = {};
  } else {
    originalObj = input;
  }
  if (_.isEmpty(self._keys)) {
    return result;
  } else {
    self._keys.map(function(k) {
      var o = self._mappings[k];
      switch(o.type){
        case 'function':
          try {
            result[k] = o.value(originalObj);
          } catch(e) {
            console.log(e);
            result[k] = null;
          }
          break;
        case 'alias':
          result[k] = originalObj[o.value];
          break;
        case 'value':
          result[k] = o.value;
          break;
        default:
          result[k] = null;
          break;
      }

      // if null or undefined, set default value
      if (_.isUndefined(result[k]) || _.isNull(result[k])) {
        result[k] = o.default;
      }

      if (converter && _.isFunction(converter)) {
        result[k] = converter(result[k]);
      }
    });
    return result;
  }
 };

/**
 * duck type check, if a object act like an entity then it is an Entity
 */
Entity.prototype.isEntity = function() {
  return this instanceof Entity;
}
