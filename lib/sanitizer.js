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
var debug = require('debug')('poplar:sanitizer');

var Helper = require('./helper');

/*!
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
 * @class
 * Sanitize all params with its corresponding sanitizer
 *
 * Below sanitizers are mostly from chriso's [validator.js](https://github.com/chriso/validator.js)
 *
 * All built-in sanitizers are listed below:

 - **blacklist(input, chars)** - remove characters that appear in the blacklist. The characters are used in a RegExp and so you will need to escape some chars, e.g. blacklist(input, '\\[\\]').
 - **escape(input)** - replace `<`, `>`, `&`, `'`, `"` and `/` with HTML entities.
 - **ltrim(input [, chars])** - trim characters from the left-side of the input.
 - **normalizeEmail(email [, options])** - canonicalize an email address. `options` is an object which defaults to `{ lowercase: true }`. With `lowercase` set to `true`, the local part of the email address is lowercased for all domains; the hostname is always lowercased and the local part of the email address is always lowercased for hosts that are known to be case-insensitive (currently only GMail). Normalization follows special rules for known providers: currently, GMail addresses have dots removed in the local part and are stripped of tags (e.g. `some.one+tag@gmail.com` becomes `someone@gmail.com`) and all `@googlemail.com` addresses are normalized to `@gmail.com`.
 - **rtrim(input [, chars])** - trim characters from the right-side of the input.
 - **stripLow(input [, keep_new_lines])** - remove characters with a numerical value < 32 and 127, mostly control characters. If `keep_new_lines` is `true`, newline characters are preserved (`\n` and `\r`, hex `0xA` and `0xD`). Unicode-safe in JavaScript.
 - **toBoolean(input [, strict])** - convert the input to a boolean. Everything except for `'0'`, `'false'` and `''` returns `true`. In strict mode only `'1'` and `'true'` return `true`.
 - **toDate(input)** - convert the input to a date, or `null` if the input is not a date.
 - **toFloat(input)** - convert the input to a float, or `NaN` if the input is not a float.
 - **toInt(input [, radix])** - convert the input to an integer, or `NaN` if the input is not an integer.
 - **toString(input)** - convert the input to a string.
 - **trim(input [, chars])** - trim characters (whitespace by default) from both sides of the input.
 - **whitelist(input, chars)** - remove characters that do not appear in the whitelist. The characters are used in a RegExp and so you will need to escape some chars, e.g. whitelist(input, '\\[\\]').
 - **xss(input, options)** - xss sanitization
 *
 * @param {Object} params
 * Parameters about to sanitizing
 *
 * Example:
 *
 * ``` javascript
 * {
 *  name: 'Felix Liu',
 *  age: 25,
 *  email: 'lyfeyaj@gmail.com'
 * }
 * ```
 *
 * @param {Object} accepts
 * Sanitizers that apply to parameters
 *
 * Example:
 *
 * ``` javascript
 * [
 *   { arg: 'name', sanitizers: { trim: true, xss: true } },
 *   { arg: 'age', sanitizers: { toInt: true }
 *   { arg: 'email', sanitizers: { trim: true }
 * ]
 * ```
 */
function Sanitize(params, accepts) {
  params = params || {};
  accepts = accepts || [];

  _.each(accepts, function(accept) {
    var name = accept.arg;
    var val = params[name];

    var sanitizers = _.extend({}, accept.sanitizes);
    if (sanitizers && _.isPlainObject(sanitizers) && !Helper.isEmpty(val)) {
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
 * Port to add new sanitizer func without violate __validator__
 *
 * Example:
 *
 * ``` javascript
 * Sanitize.extend('removeAllBlank', function(input) {
 *   return (String(input) || '').replace(/\ /g, '');
 * });
 * ```
 */
Sanitize.extend = function (name, fn) {
  Sanitizer[name] = function() {
    return fn.apply(Sanitizer, arguments);
  };
};

/*!
 * For test usage, get method from Sanitizer
 *
 * Example:
 *
 * ``` javascript
 * Sanitize.method('blacklist');
 * ```
 */
Sanitize.method = function(name) {
  return Sanitizer[name];
};
