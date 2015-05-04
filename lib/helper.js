/*!
 * Module dependencies.
 */

var _ = require('lodash');

/*!
 * Expose sort of useful functions
 */

 var Helper = {};
 module.exports = Helper;

Helper.stringify = function(val) {
  return Object.prototype.toString.call(val);
};

Helper.isEmpty = function(val) {
  return !_.isNumber(val) && _.isEmpty(val);
};

Helper.isPresent = function(val) {
  return !Helper.isEmpty(val);
};
