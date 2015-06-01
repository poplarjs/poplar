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
        expect(function(){ new ApiMethod('name', { http: 'abc' }, fn) }).to.throw(Error);
      });

      it("presenter arg must be an Entity ", function(){
        expect(function(){ new ApiMethod('name', { presenter: {} }, fn) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', { presenter: [] }, fn) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', { presenter: 'a' }, fn) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', { presenter: new Entity() }, fn) }).to.not.throw(Error);
      });
    });

    describe(':fn', function() {
      it('should be a function', function() {
        expect(function(){ new ApiMethod('name', {}, '') }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, false) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, undefined) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, null) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, []) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, {}) }).to.throw(Error);
        expect(function(){ new ApiMethod('name', {}, function(){}) }).to.not.throw(Error);
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
        input: 'ddddddd',
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
        input: 'ddd@mydomain.org',
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
        input: 'ddd@mydomain.org',
        returnValue: {
          data: [{
            myEmail: 'ddd@mydomain.org'
          }]
        },
        expectedValue: {
          myEmail: null
        }
      }));
    });
  });
});

function givenMethodExpect(options) {
  return function(done) {
    var emailEntity = new Entity();
    emailEntity.expose('myEmail', { default: null });

    var method = new ApiMethod('testMethod', {
      presenter: emailEntity,
      presenterSource: options.presenterSource,
      accepts: [
        {
          arg: 'email',
          type: 'string',
          validates: {
            isEmail: { message: 'email is not valid' },
            isLength: { args: [7, 30], message: 'length should longer than 7 and less than 30' },
            domainRestriction: function(val) {
              if (val && val.split('@')[1] === 'mydomain.org') return;
              return 'email must be xxx@mydomain.org';
            }
          }
        }
      ]
    }, function(params, next) {

      // test for context helpers
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

    var apiBuilder = new ApiBuilder();

    method.setApiBuilder(apiBuilder);

    var app = express();

    app.get('/', function(req, res) {
      var ctx = new HttpContext(req, res, method, {
        helpers: {
          isLogin: true,
          currentUser: {
            id: 1,
            name: 'Felix Liu'
          }
        }
      });
      try {
        method.invoke(ctx, function(err, result) {
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
