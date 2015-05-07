/**
 * Expose `RestAdapter`.
 */

module.exports = RestAdapter;

/**
 * Module dependencies.
 */

var debug = require('debug')('poplar:rest-adapter');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var inherits = util.inherits;
var assert = require('assert');
var express = require('express');

/**
 * Create a dynamic value from the given value.
 *
 * @param {*} val The value object
 * @param {Context} ctx The Context
 */

function RestAdapter(api, options) {
  this.api = api;
  this.options = options || (remotes.options || {}).rest;
};

RestAdapter.prototype.createHandler =  function() {

};
