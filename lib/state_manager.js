/*!
 * Expose `StateManager`.
 */
module.exports = StateManager;

/*!
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('poplar:apis');
var minimatch = require('minimatch');
var util = require('util');
var inherits = util.inherits;

/**
 * StateManager constructor
 * @class
 * @param {String} stateName initial state name
 */
function StateManager(stateName, stateParams) {
  // call super
  EventEmitter.call(this);

  // Avoid warning: possible EventEmitter memory leak detected
  this.setMaxListeners(16);

  this._state = stateName || 'initial';
  this._stateParams = stateParams || {};

  this._previousState = '';
  this._previousStateParams = {};
}

/**
 * Simplified API for creating StateManager instance, equals to `new StateManager(stateName)`
 * @param {String} stateName initial state name
 * @param {Object} stateParams initial stateParams
 * @return {StateManager} StateManager instance
 */
StateManager.init = function(stateName, stateParams) {
  return new StateManager(stateName, stateParams);
};

/*!
 * Inherit from `EventEmitter`.
 */
inherits(StateManager, EventEmitter);

/**
 * Check if a state is current state, support wildcard match
 * @param {String} stateName state name to check
 * @return {Boolean} true or false
 */
StateManager.prototype.is = function(stateName) {
  return minimatch(this._state, stateName);
};

/**
 * Check if a state is from a previous state, support wildcard match
 * @param {String} stateName state name to check
 * @return {Boolean} true or false
 */
StateManager.prototype.isFrom = function(stateName) {
  return minimatch(this._previousState, stateName);
};

/**
 * Transite a state from one to another and trigger `change` event
 * @param {String} stateName state name to check
 * @param {Object} stateParams stateParams to overwrite
 */
StateManager.prototype.transitionTo = function(stateName, stateParams) {
  var previousState = this._previousState = this._state;
  var previousStateParams = this._previousStateParams = this._stateParams;
  this._state = stateName;
  this._stateParams = stateParams || {};
  this.emit('change', previousState, stateName, previousStateParams, stateParams);
};
