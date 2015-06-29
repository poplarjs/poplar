var request = require('supertest');
var HttpContext = require('../lib/contexts/http');
var ApiMethod = require('../lib/api_method');
var expect = require('chai').expect;

describe('HttpContext', function() {
  beforeEach(function() {
    var test = this;
  });

  describe('ctx.args', function() {
    describe('arguments with a defined type (not any)', function() {
      it('should include a named string arg', givenMethodExpectArg({
        type: 'string',
        input: 'foobar',
        expectedValue: 'foobar'
      }));

      it('should coerce integer strings into actual numbers', givenMethodExpectArg({
        type: 'number',
        input: '123456',
        expectedValue: 123456
      }));

      it('should coerce float strings into actual numbers', givenMethodExpectArg({
        type: 'number',
        input: '0.123456',
        expectedValue: 0.123456
      }));

      it('should coerce number strings preceded by 0 into numbers', givenMethodExpectArg({
        type: 'number',
        input: '000123',
        expectedValue: 123
      }));

      it('should not coerce null strings into null', givenMethodExpectArg({
        type: 'string',
        input: 'null',
        expectedValue: 'null'
      }));

      it('should coerce array types properly with non-array input', givenMethodExpectArg({
        type: ['string'],
        input: 123,
        expectedValue: ['123']
      }));

      it('should not coerce a single string into a number', givenMethodExpectArg({
        type: ['string'],
        input: '123',
        expectedValue: ['123']
      }));
    });

    describe('arguments without a defined type (or any)', function() {
      it('should coerce boolean strings into actual booleans', givenMethodExpectArg({
        type: 'any',
        input: 'true',
        expectedValue: true
      }));

      it('should coerce integer strings into actual numbers', givenMethodExpectArg({
        type: 'any',
        input: '123456',
        expectedValue: 123456
      }));

      it('should coerce float strings into actual numbers', givenMethodExpectArg({
        type: 'any',
        input: '0.123456',
        expectedValue: 0.123456
      }));

      it('should coerce null strings into null', givenMethodExpectArg({
        type: 'any',
        input: 'null',
        expectedValue: null
      }));

      it('should coerce number strings preceded by 0 into strings', givenMethodExpectArg({
        type: 'any',
        input: '000123',
        expectedValue: '000123'
      }));

      it('should coerce invalid number strings as NaN', givenMethodExpectArg({
        type: 'number',
        input: '1.1.1',
        expectedValue: NaN
      }));

      it('should coerce invalid number strings as default value', givenMethodExpectArg({
        type: 'number',
        input: '1.1.1',
        useDefault: true,
        default: 10,
        expectedValue: 10
      }));

      it('should coerce invalid number strings and ignore default value', givenMethodExpectArg({
        type: 'number',
        input: '1',
        useDefault: true,
        default: 10,
        expectedValue: 1
      }));
    });
  });
});

function givenMethodExpectArg(options) {
  var accepts;
  if (options && options.useDefault) {
    accepts = [{arg: 'testArg', type: options.type, default: options.default}];
  } else {
    accepts = [{arg: 'testArg', type: options.type}];
  }
  return function(done) {
    var method = new ApiMethod('testMethod', {
      accepts: accepts
    }, function() {});

    var app = require('express')();

    app.get('/', function(req, res) {
      var ctx = new HttpContext(req, res, method.createMethodInvocation());
      try {
        expect(ctx.args.testArg).to.eql(options.expectedValue);
      } catch (e) {
        return done(e);
      }
      done();
    });

    request(app).get('/?testArg=' + options.input).end();
  };
}

function noop() {}
