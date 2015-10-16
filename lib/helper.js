/*!
 * Module dependencies.
 */

var _ = require('lodash');

/*!
 * Expose sort of useful functions
 */
var Helper = {};

/*!
 * convert obj to string
 */
Helper.obj2str = function(val) {
  return Object.prototype.toString.call(val);
};

/*!
 * check if a value is empty
 */
Helper.isEmpty = function(val) {
  if (val === 0) return true;
  if (Number.isNaN(val)) return true;
  return !_.isNumber(val) && _.isEmpty(val);
};

/*!
 * check if a value is present
 */
Helper.isPresent = function(val) {
  return !Helper.isEmpty(val);
};

/*!
 * excape RegExp string
 */
Helper.escapeRegex = function(d) {
  // see http://stackoverflow.com/a/6969486/69868
  return d.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

module.exports = Helper;
