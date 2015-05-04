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
var helper = require('./helper');

/**
 * @class A wrapper to map returns with input value.
 *
 * @constructor
 * Create a new `Entity` with the given `options`.
 */

function Entity() {
  this._mappings = {};
  this._keys = [];
};

/**
 * check whether an object is an Entity instance
 */
Entity.isEntity = function(entity) {
  return !!(entity && _.isFunction(entity.isEntity) && this.prototype.isEntity.call(entity));
}

/**
 * add a given name with or without corresponding function or value
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
  if (_.isString(name)) {
    if (_.isFunction(fn)) {
      this._mappings[name] = { type: 'function', value: fn };
    } else if (_.isPlainObject(fn)) {
      if (fn['as']) {
        if (!_.isString(fn['as'])) throw(new Error(util.format(message, fn['as'])));
        this._mappings[fn['as']] = { type: 'alias', value: name };
      } else if (fn['value']) {
        this._mappings[name] = { type: 'value', value: fn['value'] };
      } else {
        this._mappings[name] = { type: 'value', value: fn };
      }
    } else if (_.isUndefined(fn)) {
      this._mappings[name] = { type: 'alias', value: name };
    } else {
      // take other as value, such as number, array
      this._mappings[name] = { type: 'value', value: fn };
    }
    this._keys = Object.keys(this._mappings);
  } else {
    throw(new Error(util.format(message, name)));
  }
};

/**
 * parse a input object with mappings
 */

Entity.prototype.parse = function(input) {
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
          try{
            result[k] = o.value(originalObj);
          }catch(e){
            console.log(e);
          }finally{
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
    });
    return result;
  }
 };

/**
 * duck type check, if a object act like an entity then it is an Entity
 */
Entity.prototype.isEntity = function() {
  var condition = this._mappings &&
                  this._keys &&
                  this.parse &&
                  this.inspect &&
                  this.isEntity &&
                  this.add;
  return !!condition;
}

/**
 * Entity inspector
 */

Entity.prototype.inspect = function() {
  console.log('Entity Mappings: ', JSON.stringify(this._mappings));
  console.log('Entity Keys: ', this._keys);
};
