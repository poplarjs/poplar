var chai = require('chai');
var util = require('util');
var express = require('express');

var Poplar = require('../lib/poplar');
var ApiBuilder = require('../lib/api_builder');
var ApiMethod = require('../lib/api_method');

var expect = chai.expect;

describe('Poplar', function() {

  var poplar, apiBuilder;

  beforeEach(function() {
    poplar = Poplar.create();
    apiBuilder = new ApiBuilder('test', { basePath: '/test' });
  });

  it('should inherites from EventEmitter', function() {
    expect(poplar).to.have.property('_events');
    expect(poplar).to.respondTo('listeners');
    expect(poplar).to.respondTo('on');
    expect(poplar).to.respondTo('emit');
  });

  describe('#create()', function() {
    it('should return a instance of Poplar after calling', function() {
      expect(Poplar.create()).to.be.an.instanceof(Poplar);
    });

  });

  describe('#use()', function() {
    it('can use a apiBuilder or create an apiBuilder by name and options', function() {
      poplar.use(apiBuilder);
      poplar.use('test1', {});
      expect(poplar._apiBuilders).to.have.all.keys(['test', 'test1']);
    });
  });

  describe('#allMethods()', function() {
    it('should return all methods', function() {
      apiBuilder.define('methodTest0', {}, function() {});
      apiBuilder.define('methodTest1', {}, function() {});
      apiBuilder.define('methodTest2', {}, function() {});
      apiBuilder.define('methodTest3', {}, function() {});

      var apiBuilder1 = new ApiBuilder('test1', {});

      apiBuilder.define('methodTest5', {}, function() {});
      apiBuilder.define('methodTest6', {}, function() {});
      apiBuilder.define('methodTest7', {}, function() {});
      apiBuilder.define('methodTest8', {}, function() {});

      poplar.use(apiBuilder);
      poplar.use(apiBuilder1);

      expect(poplar.allMethods()).to.have.length(8);
    });
  });

  describe('#handler("rest")', function() {
    it('should return an express Router', function() {
      var app = express();
      var fn = function() {
        app.use(poplar.handler('rest'));
      };
      expect(fn).to.not.throw(Error);
    });
  });

});
