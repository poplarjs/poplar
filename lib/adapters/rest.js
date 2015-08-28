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
var async = require('async');
var bodyParser = require('body-parser');
var cors = require('cors');
var _ = require('lodash');
var Path = require('path');

var HttpContext = require('../contexts/http');
var Poplar = require('../poplar');

var json = bodyParser.json;
var urlencoded = bodyParser.urlencoded;

/**
 * Create a dynamic value from the given value.
 *
 * @param {*} val The value object
 * @param {Context} ctx The Context
 */
function RestAdapter(api, options) {
  this.api = api;
  assert(api instanceof Poplar, util.format('%s must be a Poplar instance', api));
  this.options = _.extend({}, (api.options || {}).rest, options);
  this._routes = [];
}

/**
 * Inherit from `EventEmitter`.
 */
inherits(RestAdapter, EventEmitter);

/**
 * Create a Rest Handler based on Poplar Api instance
 */
RestAdapter.prototype.createHandler =  function() {
  var router = express.Router(this.options);
  var adapter = this;
  var methods = this.api.allMethods();

  var handleUnknownPaths = this._shouldHandleUnknownPaths();

  // Add a handler to tolerate empty json as connect's json middleware throws an error
  router.use(function(req, res, next) {
    if (req.is('application/json')) {
      if (req.get('Content-Length') === '0') {
        // This doesn't cover the transfer-encoding: chunked
        req._body = true; // Mark it as parsed
        req.body = {};
      }
    }
    next();
  });

  // Set strict to be `false` so that anything `JSON.parse()` accepts will be parsed
  debug('remoting options: %j', this.api.options);
  var urlencodedOptions = this.api.options.urlencoded || {extended: true};
  if (urlencodedOptions.extended === undefined) {
    urlencodedOptions.extended = true;
  }
  var jsonOptions = this.api.options.json || { strict: false };
  var corsOptions = this.api.options.cors;
  if (corsOptions === undefined) corsOptions = { origin: true, credentials: true };

  // Optimize the cors handler
  var corsHandler = function(req, res, next) {
    var reqUrl = req.protocol + '://' + req.get('host');
    if (req.method === 'OPTIONS' || reqUrl !== req.get('origin')) {
      cors(corsOptions)(req, res, next);
    } else {
      next();
    }
  };

  // Set up CORS first so that it's always enabled even when parsing errors
  // happen in urlencoded/json
  if (corsOptions) router.use(corsHandler);

  router.use(urlencoded(urlencodedOptions));
  router.use(json(jsonOptions));

  function createRoutes() {
    _.each(methods, function(method) {
      adapter._routes.push({
        verb: (method.http.verb || 'all').toLowerCase(),
        path: Path.join('/', adapter.api.basePath, method.fullPath()),
        fullName: method.fullName(),
        description: method.description,
        handler: function(req, res, next) {
          var methodInvocation = method.createMethodInvocation();
          var ctx = new HttpContext(req, res, methodInvocation, adapter.options);
          adapter.invokeMethod(ctx, methodInvocation, next);
        }
      });
    });
  }

  function applyRoutes() {
    _.each(adapter._routes, function(route) {
      assert(router[route.verb], util.format('Method `%s` contains invalid http verb: %s', route.fullName, route.verb));
      router[route.verb](route.path, route.handler);
    });
  }

  createRoutes();
  applyRoutes();

  this.debugAllRoutes();

  if (handleUnknownPaths) {
    // Convert requests for unknown methods of this sharedClass into 404.
    // Do not allow other middleware to invade our URL space.
    router.use(RestAdapter.methodNotFoundHandler());
  }

  if (handleUnknownPaths) {
    // Convert requests for unknown URLs into 404.
    // Do not allow other middleware to invade our URL space.
    router.use(RestAdapter.urlNotFoundHandler());
  }

  router.use(RestAdapter.errorHandler(adapter.options));

  return router;
};

/**
 * return All Routes
 */
RestAdapter.prototype.allRoutes = function() {
  return this._routes || [];
};

/**
 * debug all routes as human readable
 */
RestAdapter.prototype.debugAllRoutes = function() {
  var infos = [];
  infos.push('ALL ROUTERS:');
  _.each(this.allRoutes(), function(route) {
    var str = route.fullName;
    str = [_.padRight(str, 25), route.verb.toUpperCase()].join(' ');
    str = [_.padRight(str, 36), route.path].join(' ');
    infos.push(util.format('  %s:', route.description || ''));
    infos.push(util.format('  ==>  %s', str));
  });
  var longestSentence = _.max(infos, function(sentence) {
    return (sentence || '').length;
  });
  var padRight = longestSentence.length + 4;
  _.each(infos, function(sentence) {
    debug(_.padRight(sentence, padRight));
  });
};

/**
 * invode method with specific context and callbacks
 */
RestAdapter.prototype.invokeMethod = function(ctx, method, next) {
  var api = this.api;

  async.series(
    [api.invokeMethodInContext.bind(this.api, method, ctx)],
    function(err) {
      if (err) return next(err);
      ctx.done();
      // Do not call next middleware, the request is handled
    }
  );
};

/**
 * check if should handle unknown path error
 */
RestAdapter.prototype._shouldHandleUnknownPaths = function() {
  return !(this.options && this.options.handleUnknownPaths === false);
};

/**
 * default method not found error handler
 */
RestAdapter.methodNotFoundHandler = function() {
  return function restMethodNotFound(req, res, next) {
    var message ='There is no method handling ' + req.method + ' ' + req.url;
    var error = new Error(message);
    error.status = error.statusCode = 404;
    next(error);
  };
};

/**
 * default url not found handler
 */
RestAdapter.urlNotFoundHandler = function() {
  return function restUrlNotFound(req, res, next) {
    var message = 'There is no method to handle ' + req.method + ' ' + req.url;
    var error = new Error(message);
    error.status = error.statusCode = 404;
    next(error);
  };
};

/**
 * Set error handler, if no errorHandler in options, then will use the default one
 */
RestAdapter.errorHandler = function(options) {
  options = options || {};
  return function restErrorHandler(err, req, res, next) {
    if (typeof options.errorHandler === 'function') {
      try {
        options.errorHandler(err, req, res, next);
      } catch (e) {
        defaultHandler(e);
      }
    } else {
      return defaultHandler();
    }

    function defaultHandler(handlerError) {
      if (handlerError) {
        // ensure errors that occurred during
        // the handler are reported
        err = handlerError;
      }
      if (typeof err === 'string') {
        err = new Error(err);
        err.status = err.statusCode = 500;
      }

      res.statusCode = err.statusCode || err.status || 500;

      debug('Error in %s %s: %s', req.method, req.url, err.stack);
      var data = {
        name: err.name,
        status: res.statusCode,
        message: err.message || 'An unknown error occurred'
      };

      for (var prop in err) {
        data[prop] = err[prop];
      }

      data.stack = err.stack;
      if (process.env.NODE_ENV === 'production' || options.disableStackTrace) {
        delete data.stack;
      }
      res.send({ error: data });
    }
  };
};
