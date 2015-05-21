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
      if (fn === true) {
        self.add(name);
      } else if (Array.isArray(fn)){
        fn.unshift(name);
        self.add.apply(self, fn);
      } else {
        fn = [name, fn];
        self.add.apply(self, fn);
      }
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
 * { type: 'alias', value: 'name', default: null, using: MyEntity, if: function(obj, opts) {} }
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
 *    entity.add('activities', { using: myActivityEntity });
 *    entity.add('extraInfo', { using: myExtraInfoEntity });
 *    entity.add('condition', { if: function(obj, options) { return true } });
 */
Entity.prototype.add = function() {
  // ...names, options, fn

  var message = '\'%s\' is not a valid string';
  var self = this;

  assert(arguments.length !== 0, util.format(message, undefined));

  var options, fn;

  if (arguments.length > 1) {

    // extract `fn`
    if (_.isFunction(_.last(arguments))) {
      fn = Array.prototype.pop.call(arguments);
    }

    // extract `options`
    options = _.isPlainObject(_.last(arguments)) ? Array.prototype.pop.call(arguments) : {};

    if (arguments.length > 1) {
      assert(!options['as'], 'You may not use the :as option on multi-attribute exposures.');
      assert(!fn, 'You may not use function on multi-attribute exposures.');
    }

  } else {
    options = {};
  }

  _.each(arguments, function(name) {
    var value = null,
        defaultVal = null,
        type = null,
        using = null,
        ifFn = null;

    assert(_.isString(name) && /^[a-zA-Z0-9_]+$/g.test(name), util.format(message, name)); // name must be a string
    assert(!(options['as'] && fn), 'You may not use the :as option with function.');
    assert(!(options['value'] && fn), 'You may not use the :value option with function.');
    assert(!(options['value'] && options['as']), 'You may not use the :value option with :as option.');

    type = 'alias';
    value = name;

    if (fn) {
      type = 'function';
      value = fn;
    }

    if (!_.isEmpty(options)) {

      if (options.hasOwnProperty('default')) {
        defaultVal = _.isUndefined(options['default']) ? null : options['default'];
      }

      if (options['if']) {
        assert(_.isFunction(options['if']), 'if condition must be a function');
        ifFn = options['if'];
      }

      if (options['using']) {
        assert(Entity.isEntity(options['using']), '`using` must be a Entity');
        using = options['using'];
      }

      if (options['as']) {
        if (!_.isString(options['as'])) throw(new Error(util.format(message, options['as'])));
        type = 'alias';
        value = name;
        name = options['as'];
      } else if (options['value']) {
        type = 'value';
        value = options['value'];
      }

    }

    self._mappings[name] = { type: type, value: value, default: defaultVal, if: ifFn, using: using };

    // always get all keys after add a new field
    self._keys = Object.keys(self._mappings);
  });
};

/**
 * Entity.prototype.add alias
 */
Entity.prototype.expose = Entity.prototype.add;

/**
 * parse a input object with mappings
 * @param {Object} input: input object values
 * @param {Function} converter: value converter, which can accept one parameter
 */
Entity.prototype.parse = function(input, options, converter) {
  debug('parsing %j with options %j and converter', input, options);
  var originalObj;
  var result = {};
  var self = this;

  if (_.isUndefined(input) || _.isNull(input)) {
    originalObj = {};
  } else {
    originalObj = input;
  }

  if (_.isFunction(options)) {
    converter = options;
  }

  if (!_.isPlainObject(options)) {
    options = {};
  }

  if (Array.isArray(originalObj)) {
  // if input is an Array, then loop it
    result = [];
    originalObj.forEach(function(obj) {
      result.push(self.parse(obj, options, converter));
    });
    return result;

  } else {
    if (_.isEmpty(self._keys)) {
      // if no exposes, return
      return result;
    } else {
      self._keys.forEach(function(k) {
        var o = self._mappings[k];

        if (o['if'] && !o['if'](originalObj, options)) {
          return;
        }

        switch(o.type){
          case 'function':
            try {
              result[k] = o.value(originalObj, options);
            } catch(e) {
              debug(e);
              result[k] = null;
            }
            break;
          case 'alias':
            result[k] = originalObj[o.value];
            break;
          case 'value':
            result[k] = o.value;
            break;
        }

        // if null or undefined, set default value
        if (_.isUndefined(result[k]) || _.isNull(result[k])) {
          result[k] = o.default;
        }

        if (converter && _.isFunction(converter)) {
          result[k] = converter(result[k], options);
        }

        if (o.using) {
          result[k] = o.using.parse(result[k], options, converter);
        }
      });
      return result;
    }
  }
};

/**
 * check if an object is an Entity
 */
Entity.prototype.isEntity = function() {
  return this instanceof Entity;
}
