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
  return !_.isNumber(val) && _.isEmpty(val);
};

/*!
 * check if a value is present
 */
Helper.isPresent = function(val) {
  return !Helper.isEmpty(val);
};

module.exports = Helper;
