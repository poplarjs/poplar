/*!
 * Module dependencies.
 */

var _ = require('lodash');

/*!
 * Expose sort of useful functions
 */

var Helper = {};

Helper.obj2str = function(val) {
  return Object.prototype.toString.call(val);
};

Helper.isEmpty = function(val) {
  if (val === 0) return true;
  return !_.isNumber(val) && _.isEmpty(val);
};

Helper.isPresent = function(val) {
  return !Helper.isEmpty(val);
};

module.exports = Helper;
