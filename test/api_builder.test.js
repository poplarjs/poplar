var chai = require('chai');
var util = require('util');

var ApiBuilder = require('../lib/api_builder');
var ApiMethod = require('../lib/api_method');

var expect = chai.expect;

describe('ApiBuilder', function() {

  var apiBuilder;

  beforeEach(function() {
    apiBuilder = new ApiBuilder('test', {});
  });

  describe('#constructor', function() {
    describe(':name', function() {
      it('should be a valid string', function() {
        expect(function(){ new ApiBuilder('name'); }).to.not.throw(Error);
        expect(function(){ new ApiBuilder('name_'); }).to.not.throw(Error);
        expect(function(){ new ApiBuilder('name_12'); }).to.not.throw(Error);
        expect(function(){ new ApiBuilder('name_!'); }).to.throw(Error);
        expect(function(){ new ApiBuilder(' '); }).to.throw(Error);
        expect(function(){ new ApiBuilder('-'); }).to.throw(Error);
        expect(function(){ new ApiBuilder({}); }).to.throw(Error);
        expect(function(){ new ApiBuilder([]); }).to.throw(Error);
      });

      it('can be empty', function() {
        expect(function() { new ApiBuilder(false) }).to.not.throw(Error);
        expect(function() { new ApiBuilder('') }).to.not.throw(Error);
        expect(function() { new ApiBuilder() }).to.not.throw(Error);
        expect(function() { new ApiBuilder(0) }).to.not.throw(Error);
        expect(function() { new ApiBuilder(undefined) }).to.not.throw(Error);
        expect(function() { new ApiBuilder(null) }).to.not.throw(Error);
      });
    });

    describe(':options', function() {
      it('should be a plain object', function() {
        expect(function() { new ApiBuilder('name', '123') }).to.throw(Error);
        expect(function() { new ApiBuilder('name', 123) }).to.throw(Error);
        expect(function() { new ApiBuilder('name', []) }).to.throw(Error);
        expect(function() { new ApiBuilder('name', {}) }).to.not.throw(Error);
      });
    });
  });

  describe('#define()', function() {
    it('should define a new method via ApiMethod or name, options and fn', function() {
      var apiMethod = new ApiMethod('info', {}, function(){});
      apiBuilder.define(apiMethod);
      apiBuilder.define('info1', {}, function() {});
      expect(apiBuilder.methods()).to.have.all.keys(['info', 'info1']);
    });
  });

  describe('#extend()', function() {
    it('should have the same methods, name and options for extended apiBuilder', function() {
      apiBuilder.define('info', {}, function() {});
      var apiBuilder1 = new ApiBuilder();
      apiBuilder1.extend(apiBuilder);
      expect(apiBuilder.methods()).to.have.all.keys(['info']);
      expect(apiBuilder1.methods()).to.have.all.keys(['info']);
      expect(apiBuilder1.name).to.equal(apiBuilder.name);
      expect(apiBuilder1.options).to.eql(apiBuilder.options);
    });
  });

  describe('#method()', function() {
    it('should return method fn by name', function() {
      var apiMethod = new ApiMethod('info', {}, function(){});
      apiBuilder.define(apiMethod);
      expect(apiBuilder.method('info')).to.eql(apiMethod);
    });
  });

  describe('#methods()', function() {
    it('should return all methods', function() {
      var apiMethod = new ApiMethod('info', {}, function(){});
      apiBuilder.define(apiMethod);
      expect(apiBuilder.methods()).to.eql({ info: apiMethod });
    });
  });

  describe('#before(methodMatch, fn)', function() {
    it('should add a before hook', function() {
      apiBuilder.before('info', function(ctx, next) { return; });
      expect(apiBuilder._events).to.have.property('before.test.info')
    });

    it('should add two before hook', function() {
      apiBuilder.before('login', 'info', function(ctx, next) { return; });
      expect(apiBuilder._events).to.have.property('before.test.login');
      expect(apiBuilder._events).to.have.property('before.test.info');
    });
  });

  describe('#after(methodMatch, fn)', function() {
    it('should add a after hook', function() {
      apiBuilder.after('info', function(ctx, next) { return; });
      expect(apiBuilder._events).to.have.property('after.test.info')
    });

    it('should add two after hook', function() {
      apiBuilder.after('login', 'info', function(ctx, next) { return; });
      expect(apiBuilder._events).to.have.property('after.test.login');
      expect(apiBuilder._events).to.have.property('after.test.info');
    });
  });

  describe('#afterError(methodMatch, fn)', function() {
    it('should add a afterError hook', function() {
      apiBuilder.afterError('info', function(ctx, next) { return; });
      expect(apiBuilder._events).to.have.property('afterError.test.info')
    });

    it('should add two afterError hook', function() {
      apiBuilder.afterError('login', 'info', function(ctx, next) { return; });
      expect(apiBuilder._events).to.have.property('afterError.test.login');
      expect(apiBuilder._events).to.have.property('afterError.test.info');
    });
  });
});
