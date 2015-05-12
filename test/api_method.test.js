var chai = require('chai');
var util = require('util');

var ApiMethod = require('../lib/api_method');
var Entity = require('../lib/entity');

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

  describe('#prototype', function() {
    describe('#clone', function() {
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
  });
});
