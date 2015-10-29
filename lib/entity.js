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

var Dynamic = require('./dynamic');

/**
 * @class A wrapper to map returns with input value.
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
    });
  } else if (!_.isUndefined(definitions)) {
    assert(false, util.format('\'%s\' is not a valid object', definitions));
  }
}

/**
 * check whether an object is an Entity instance
 */
Entity.isEntity = function(entity) {
  return !!(entity && _.isFunction(entity.isEntity) && this.prototype.isEntity.call(entity));
};

/**
 * add a given name with or without corresponding function or value
 * { act: 'alias',
 *   value: 'name',
 *   default: null,
 *   using: MyEntity,
 *   if: function(obj, opts) {}
 * }
 * type: support array type
 *    number or ['number']
 *    date or ['date']
 *    string or ['string']
 *    boolean or ['boolean']
 *    any (default) or ['any']
 * act:
 *    function
 *    alias
 *    value
 * Usage:
 *    var entity = new Entity();
 *    entity.add('name');
 *    entity.add('name', { as: 'fullname' });
 *    entity.add('name', { type: 'string', as: 'fullname' });
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
      assert(!options.as, 'You may not use the :as option on multi-attribute exposures.');
      assert(!fn, 'You may not use function on multi-attribute exposures.');
    }

  } else {
    options = {};
  }

  _.each(arguments, function(name) {
    var value = null,
        defaultVal = null,
        act = null,
        type = null,
        using = null,
        ifFn = null;

    assert(_.isString(name) && /^[a-zA-Z0-9_]+$/g.test(name), util.format(message, name)); // name must be a string
    assert(!(options.as && fn), 'You can not use the :as option with function.');
    assert(!(options.value && fn), 'You can not use the :value option with function.');
    assert(!(options.value && options.as), 'You can not use the :value option with :as option.');

    if (Array.isArray(options.type)) {
      type = [options.type[0] || 'any'];
    } else {
      type = options.type || 'any';
    }

    act = 'alias';
    value = name;

    if (fn) {
      act = 'function';
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

      if (options.using) {
        assert(Entity.isEntity(options.using), '`using` must be a Entity');
        using = options.using;
      }

      if (options.as) {
        if (!_.isString(options.as)) throw(new Error(util.format(message, options.as)));
        act = 'alias';
        value = name;
        name = options.as;
      } else if (options.value) {
        act = 'value';
        value = options.value;
      }

    }

    self._mappings[name] = {
      type: type,
      act: act,
      value: value,
      default: defaultVal,
      if: ifFn,
      using: using
    };

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
    _.each(originalObj, function(obj) {
      result.push(self.parse(obj, options, converter));
    });
    return result;

  } else {
    if (_.isEmpty(self._keys)) {
      // if no exposes, return
      return result;
    } else {
      _.each(self._keys, function(k) {
        var o = self._mappings[k];
        var val = null;

        if (o['if'] && !o['if'](originalObj, options)) {
          return;
        }

        switch(o.act){
          case 'function':
            try {
              val = o.value(originalObj, options);
            } catch(e) {
              console.error(e);
              val = null;
            }
            break;
          case 'alias':
            val = originalObj[o.value];
            break;
          case 'value':
            val = o.value;
            break;
        }

        var isDefaultValueApplied = false;
        // if value is `null`, `undefined`, set default value
        if (_.isUndefined(val) || _.isNull(val)) {
          val = o.default;
          isDefaultValueApplied = true;
        }

        if (converter && _.isFunction(converter)) {
          val = converter(val, options);
        }

        if (!isDefaultValueApplied && o.using) {
          val = o.using.parse(val, options, converter);
        }

        // cast type according to predefined dynamic converters
        try {
          val = Dynamic.convert(val, o.type, options);
        } catch (e) {
          console.error(e);
        }

        result[k] = val;
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
};
