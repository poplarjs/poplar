/*!
 * Expose `Sanitize`.
 */
module.exports = Sanitize;

/*!
 * Module dependencies.
 */
var _ = require('lodash');
var __validator__ = require('validator');
var xss = require('xss');
var util = require('util');
var helper = require('./helper');
var debug = require('debug')('poplar:formatter');

/**
 * @class A collection of sanitizers
 */
function Sanitizer() {}

// sanitizers from `__validator__`
[
  'blacklist',
  'escape',
  'ltrim',
  'normalizeEmail',
  'rtrim',
  'stripLow',
  'toBoolean',
  'toDate',
  'toFloat',
  'toInt',
  'toString',
  'trim',
  'whitelist'
].forEach(function(name) {
  if (typeof __validator__[name] === 'function') {
    Sanitizer[name] = function() {
      return __validator__[name].apply(__validator__, arguments);
    };
  }
});

// Add xss sanitizer
Sanitizer.xss = xss;

/**
 * Iterate all accepts to format params
 * Usage:
 *    sanitizes: {
 *      xss: true,
 *      trim: true
 *    }
 */
function Sanitize(params, accepts) {
  params = params || {};
  accepts = accepts || [];

  _.each(accepts, function(accept) {
    var name = accept.arg;
    var val = params[name];

    var sanitizers = _.extend({}, accept.sanitizes);
    if (sanitizers && _.isPlainObject(sanitizers) && !helper.isEmpty(val)) {
      _.each(sanitizers, function(sanitizerOpts, sanitizerName) {

        // if sanitizer is a custom function, then execute it
        // else find coorespond sanitizer in built in Sanitizer
        if (_.isFunction(sanitizerOpts)) {
          try {
            val = sanitizerOpts(val, params);
          } catch (e) {
            debug('Error: \'%s\' when calling function \'%s\'', e.message, sanitizerName);
          }
        } else {

          if (!sanitizerOpts) { return; }
          var sanitizer = Sanitizer[sanitizerName];
          var args = [val];
          if (!_.isBoolean(sanitizerOpts)) {
            args.push(sanitizerOpts);
          }
          args = _.flatten(args);

          if (sanitizer && _.isFunction(sanitizer)) {
            try {
              val = sanitizer.apply(Sanitizer, args);
            } catch (e) {
              debug('Error: \'%s\' when calling function \'%s\'', e.message, sanitizerName);
            }
          } else {
            debug('Sanitizer \'%s\' is not defined', sanitizerName);
          }
        }
      });

      params[name] = val;
    }
  });
  return params;
}

/**
 * Port to add new formatter func without violate __validator__
 */
Sanitize.extend = function (name, fn) {
  Sanitizer[name] = function() {
    return fn.apply(Sanitizer, arguments);
  };
};
