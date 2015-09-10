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
      // define method
      apiBuilder.define('info', {}, function() {});

      // define hooks
      apiBuilder.before('info', function() {});
      apiBuilder.after('info', function() {});
      apiBuilder.afterError('info', function() {});

      var apiBuilder1 = new ApiBuilder();
      apiBuilder1.extend(apiBuilder);
      expect(apiBuilder.methods()).to.have.all.keys(['info']);
      expect(apiBuilder1.methods()).to.have.all.keys(['info']);
      expect(apiBuilder1.name).to.equal(apiBuilder.name);
      expect(apiBuilder1.options).to.eql(apiBuilder.options);
      expect(apiBuilder1._events).to.have.property('before.test.info');
      expect(apiBuilder1._events).to.have.property('after.test.info');
      expect(apiBuilder1._events).to.have.property('afterError.test.info');
    });
  });

  describe('#undefine()', function() {
    it('should undefine the pre-defined method', function() {
      // define method
      apiBuilder.define('info', {}, function() {});
      expect(apiBuilder.method('info')).to.have.property('name', 'info');

      // undefine method
      apiBuilder.undefine('info');
      expect(apiBuilder.method('info')).to.be.undefined;
    });
  });

  describe('#exists()', function() {
    it('should return true if a method is exists', function() {
      // define method
      apiBuilder.define('info', {}, function() {});
      expect(apiBuilder.exists('info')).to.be.true;
    });
  });

  describe('#prepend()', function() {
    it('should a method before a specific method', function() {
      // define method
      apiBuilder.define('methodToBePrepended', {}, function() {});
      apiBuilder.define('middleMethod', {}, function() {});
      apiBuilder.define('methodToBePrepending', {}, function() {});

      expect(Object.keys(apiBuilder.methods())).to.be.eql(['methodToBePrepended', 'middleMethod', 'methodToBePrepending']);
      apiBuilder.prepend('methodToBePrepending', 'methodToBePrepended');
      expect(Object.keys(apiBuilder.methods())).to.be.eql(['methodToBePrepending', 'methodToBePrepended', 'middleMethod']);
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
