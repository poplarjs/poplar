var chai = require('chai');
var util = require('util');
var express = require('express');
var request = require('supertest');

var ApiMethod = require('../lib/api_method');
var ApiBuilder = require('../lib/api_builder');
var Entity = require('../lib/entity');
var HttpContext = require('../lib/contexts/http');

var expect = chai.expect;

describe('ApiMethod', function() {
  describe('#constructor', function() {
    describe(':name', function() {
      it('should be a valid string', function() {
        var fn = function() {};
        expect(function(){ new ApiMethod('name', {}, fn); }).to.not.throw(Error);
        expect(function(){ new ApiMethod('name_', {}, fn); }).to.not.throw(Error);
        expect(function(){ new ApiMethod('name_12', {}, fn); }).to.not.throw(Error);
        expect(function(){ new ApiMethod('name_!', {}, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod(' ', {}, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod('-', {}, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod({}, {}, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod([], {}, fn); }).to.throw(Error);
      });
    });

    describe(':options', function() {
      var fn;

      beforeEach(function() {
        fn = function(){};
      });

      it("http arg must be a plain object", function(){
        expect(function(){ new ApiMethod('name', { http: 'abc' }, fn); }).to.throw(Error);
      });

      it("presenter arg must be an Entity ", function(){
        expect(function(){ new ApiMethod('name', { presenter: {} }, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', { presenter: [] }, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', { presenter: 'a' }, fn); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', { presenter: new Entity() }, fn); }).to.not.throw(Error);
      });
    });

    describe(':fn', function() {
      it('should be a function', function() {
        expect(function(){ new ApiMethod('name', {}, ''); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, false); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, undefined); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, null); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, []); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, {}); }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, function(){}); }).to.not.throw(Error);
      });
    });
  });

  describe('#create()', function() {
    it('should create a instance of ApiMethod', function() {
      expect(ApiMethod.create('name', {}, function(){})).to.be.an.instanceof(ApiMethod);
    });
  });

  describe('#getType()', function() {
    it('should return cooresponding type for obj', function() {
      expect(ApiMethod.getType(undefined)).to.equal('undefined');
      expect(ApiMethod.getType(null)).to.equal('null');
      expect(ApiMethod.getType({})).to.equal('object');
      expect(ApiMethod.getType([])).to.equal('array');
      expect(ApiMethod.getType(new Array())).to.equal('array');
      expect(ApiMethod.getType('')).to.equal('string');
      expect(ApiMethod.getType(true)).to.equal('boolean');
      expect(ApiMethod.getType(false)).to.equal('boolean');
      expect(ApiMethod.getType(1)).to.equal('number');
      expect(ApiMethod.getType(-1)).to.equal('number');
      expect(ApiMethod.getType(0)).to.equal('number');
      expect(ApiMethod.getType(function(){})).to.equal('function');
      expect(ApiMethod.getType(new Date())).to.equal('date');
    });
  });

  describe('#prototype', function() {
    describe('#clone()', function() {
      it('should create a clone of an existing method', function() {
        var apiMethod = new ApiMethod('name', { accepts: [{ isString: {} }] }, function(params, next) { next(params); });
        var apiMethodClone = apiMethod.clone();

        expect(apiMethodClone).to.have.property('name', apiMethod.name);
        expect(apiMethodClone).to.have.property('accepts', apiMethod.accepts);
        expect(apiMethodClone).to.have.property('returns', apiMethod.returns);
        expect(apiMethodClone).to.have.property('description', apiMethod.description);
        expect(apiMethodClone).to.have.property('presenter', apiMethod.presenter);
        expect(apiMethodClone).to.have.property('notes', apiMethod.notes);
        expect(apiMethodClone.fn.toString()).to.eql(apiMethod.fn.toString());
      });
    });

    describe('#fullName()', function() {
      it('should return fullName with ApiBuilder', function() {
        var fn = function() {};
        var apiBuilder = new ApiBuilder('test');
        var apiMethod = new ApiMethod('method', {}, fn);
        var apiMethod1 = new ApiMethod('method1', {}, fn);
        apiMethod.setApiBuilder(apiBuilder);
        expect(apiMethod.fullName()).to.equal('test.method');
        expect(apiMethod1.fullName).to.throw(Error);
      });
    });

    describe('#fullPath()', function() {
      it('should return fullPath with ApiBuilder', function() {
        var fn = function() {};
        var apiBuilder = new ApiBuilder('test');
        var apiMethod = new ApiMethod('method', { http: { path: 'method' } }, fn);
        var apiMethod1 = new ApiMethod('method1', {}, fn);
        apiMethod.setApiBuilder(apiBuilder);
        expect(apiMethod.fullPath()).to.equal('/test/method');
        expect(apiMethod1.fullPath).to.throw(Error);
      });
    });

    describe('#invoke()', function() {
      it('should return all errors message, if failed validtions', givenMethodExpect({
        input: 'ddg',
        expectedValue: {
          validations: {
            errors: {
              email: {
                domainRestriction: "email must be xxx@mydomain.org",
                isEmail: "email is not valid",
                isLength: "length should longer than 7 and less than 30"
              }
            },
            message: "email is not valid; length should longer than 7 and less than 30; email must be xxx@mydomain.org"
          }
        }
      }));

      it('should pass isLenght, if length longer than 7 and less than 30', givenMethodExpect({
        input: 'dddddddd',
        expectedValue: {
          validations: {
            errors: {
              email: {
                domainRestriction: "email must be xxx@mydomain.org",
                isEmail: "email is not valid",
              }
            },
            message: "email is not valid; email must be xxx@mydomain.org"
          }
        }
      }));

      it('should pass isEmail, if email is valid', givenMethodExpect({
        input: 'd@d.cc',
        expectedValue: {
          validations: {
            errors: {
              email: {
                domainRestriction: "email must be xxx@mydomain.org",
                isLength: "length should longer than 7 and less than 30"
              }
            },
            message: "length should longer than 7 and less than 30; email must be xxx@mydomain.org"
          }
        }
      }));

      it('should return expected value, if pass validtions', givenMethodExpect({
        input: 'ddd@mydomain.org',
        expectedValue: {
          myEmail: 'ddd@mydomain.org'
        }
      }));

      it('should return expected value, if use presenterSource', givenMethodExpect({
        input: ' ddd@mydomain.ORG ',
        presenterSource: 'data[0]',
        returnValue: {
          data: [{
            myEmail: 'ddd@mydomain.org'
          }]
        },
        expectedValue: {
          data: [{
            myEmail: 'ddd@mydomain.org'
          }]
        }
      }));

      it('should return expected value, if not use presenterSource', givenMethodExpect({
        input: 'ddd@MYDOMAIN.org',
        returnValue: {
          data: [{
            myEmail: 'ddd@mydomain.org'
          }]
        },
        expectedValue: {
          myEmail: null
        }
      }));

      it('should return expected value by `returns` function', givenMethodExpect({
        input: 'ddd@mydomain.org',
        presenterSource: 'data[0]',
        returnValue: {
          data: [{
            myEmail: 'ddd@mydomain.org'
          }]
        },
        expectedValue: {
          message: 'success',
          specialData: [{
            myEmail: 'ddd@mydomain.org'
          }]
        },
        returns: function(ctx, next) {
          var result = ctx.result;
          next(null, { specialData: result.data, message: 'success' });
        }
      }));
    });
  });

  describe('MethodInvocation', function() {

    var method, methodInvocation;

    beforeEach(function() {
      method = createMethod({
        presenterSource: 'data[0]',
        returnValue: {
          data: [{
            myEmail: 'ddd@mydomain.org'
          }]
        }
      });
      methodInvocation = method.createMethodInvocation();
    });

    describe('inherits', function() {
      it('should inherite all methods from ApiMethod', function() {
        var _expect = givenPrototypeMethodExpect(method, methodInvocation);
        _expect('createMethodInvocation');
        _expect('clone');
        _expect('fullName');
        _expect('fullPath');
        _expect('setApiBuilder');
        _expect('invoke');
        _expect('__original');
        _expect('fn');
        _expect('name');
        _expect('_apiBuilder');
        _expect('accepts');
        _expect('returns');
        _expect('presenter');
        _expect('presenterSource');
        _expect('description');
        _expect('http');
        _expect('validate');
        _expect('sanitize');
      });
    });


    describe('#prototype', function() {
      describe('init()', function() {
        it('should contains init statues for validation and sanitization', function() {
          expect(methodInvocation).to.have.property('isValidated', false);
          expect(methodInvocation).to.have.property('isSanitized', false);
        });
      });

      describe('#set(name, obj)', function() {
        it('should set locals by given key, value', function() {
          methodInvocation.set('name', 'Felix Liu');
          methodInvocation.set('age', 12);

          expect(methodInvocation.locals.name).to.equals('Felix Liu');
          expect(methodInvocation.locals.age).to.equals(12);
          expect(methodInvocation.locals.notDefined).to.equals(undefined);
          expect(method).to.not.have.property('locals');
          expect(method).to.not.respondTo('set');
        });
      });

      describe('#get(name)', function() {
        it('should return value by given key', function() {
          methodInvocation.set('name', 'Felix Liu');
          methodInvocation.set('age', 12);

          expect(methodInvocation.get('name')).to.equals('Felix Liu');
          expect(methodInvocation.get('age')).to.equals(12);
          expect(methodInvocation.get('notDefined')).to.equals(undefined);
          expect(method).to.not.respondTo('get');
        });
      });

      describe('irrelevent between method and methodInvocation', function() {
        it('should not share property', function() {
          methodInvocation._myName = 'Felix Liu';
          methodInvocation._age = 12;

          expect(methodInvocation).to.have.property('_myName', 'Felix Liu');
          expect(methodInvocation).to.have.property('_age', 12);
          expect(method).to.not.have.property('_myName');
          expect(method).to.not.have.property('_age');
        });
      });
    });
  });
});

function givenPrototypeMethodExpect(method, methodInvocation) {
  return function(methodName) {
    if (typeof method[methodName] === 'function') {
      expect(method[methodName].toString()).to.equals(methodInvocation[methodName].toString());
    } else {
      expect(method.hasOwnProperty(methodName)).to.equals(true);
      expect(methodInvocation.hasOwnProperty(methodName)).to.equals(true);
      expect((method[methodName] || '').toString()).to.equals((methodInvocation[methodName] || '').toString());
    }
  };
}

function createMethod(options) {
  var emailEntity = new Entity();
  emailEntity.expose('myEmail', { default: null });

  return new ApiMethod('testMethod', {
    presenter: emailEntity,
    presenterSource: options.presenterSource,
    accepts: [
      {
        arg: 'email',
        type: 'string',
        sanitizes: {
          trim: true,
          toLowerCase: function(val, params) {
            return String(val).toLowerCase();
          }
        },
        validates: {
          isEmail: { message: 'email is not valid' },
          isLength: { args: [7, 30], message: 'length should longer than 7 and less than 30' },
          domainRestriction: function(val) {
            if (val && val.split('@')[1] === 'mydomain.org') return;
            return 'email must be xxx@mydomain.org';
          }
        }
      }
    ],
    returns: typeof options.returns === 'function' ? options.returns : null
  }, function(params, next) {

    // test for method helpers
    expect(this).to.have.property('isValidated', true);
    expect(this).to.have.property('isSanitized', true);
    expect(this).to.have.property('isLogin', true);
    expect(this).to.have.deep.property('currentUser.id', 1);
    expect(this).to.have.deep.property('currentUser.name', 'Felix Liu');

    if (options.returnValue) {
      next(null, options.returnValue);
    } else {
      next(null, {
        myEmail: params.email
      });
    }
  });
}

function givenMethodExpect(options) {
  return function(done) {

    var method = createMethod(options);

    var apiBuilder = new ApiBuilder();

    method.setApiBuilder(apiBuilder);

    var app = express();

    var methodInvocation = method.createMethodInvocation();

    methodInvocation.isLogin = true;
    methodInvocation.currentUser = { id: 1, name: 'Felix Liu' };

    app.get('/', function(req, res) {
      var ctx = new HttpContext(req, res, methodInvocation);
      try {
        methodInvocation.invoke(ctx, function(err, result) {
          if (err) {
            expect(err).to.eql(options.expectedValue);
          } else {
            expect(result).to.eql(options.expectedValue);
          }
          done();
        });
      } catch (e) {
        return done(e);
      }
    });

    request(app).get('/?email=' + options.input).end();
  };
}
