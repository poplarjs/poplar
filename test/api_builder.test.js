var chai = require('chai');
var util = require('util');

var ApiBuilder = require('../lib/api_builder');

var expect = chai.expect;

describe('ApiBuilder', function() {
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
});
