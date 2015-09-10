var chai = require('chai');
var util = require('util');

var Helper = require('../lib/helper');

var expect = chai.expect;

describe('Helper', function() {
  describe('#obj2str(obj)', function() {
    it('should return [object Function] if obj is a funtion', function() {
      expect(Helper.obj2str(function(){})).to.equal('[object Function]');
    });

    it('should return [object Array] if obj is a Array', function() {
      expect(Helper.obj2str([])).to.equal('[object Array]');
      expect(Helper.obj2str(new Array())).to.equal('[object Array]');
      expect(Helper.obj2str([{}])).to.equal('[object Array]');
    });

    it('should return [object Object] if obj is a Object', function() {
      expect(Helper.obj2str({})).to.equal('[object Object]');
    });

    it('should return [object String] if obj is a String', function() {
      expect(Helper.obj2str('')).to.equal('[object String]');
    });

    it('should return [object Number] if obj is a Number', function() {
      expect(Helper.obj2str(1.2)).to.equal('[object Number]');
      expect(Helper.obj2str(1)).to.equal('[object Number]');
      expect(Helper.obj2str(-1)).to.equal('[object Number]');
    });

    it('should return [object RegExp] if obj is a RegExp', function() {
      expect(Helper.obj2str(/[a-z]/)).to.equal('[object RegExp]');
      expect(Helper.obj2str(new RegExp(''))).to.equal('[object RegExp]');
    });

    it('should return [object Boolean] if obj is a Boolean', function() {
      expect(Helper.obj2str(true)).to.equal('[object Boolean]');
      expect(Helper.obj2str(false)).to.equal('[object Boolean]');
    });
  });

  describe('#isEmpty(obj)', function() {
    it('should not be emtpy, when obj is a number', function() {
      expect(Helper.isEmpty(1)).to.equal(false);
      expect(Helper.isEmpty(-1)).to.equal(false);
      expect(Helper.isEmpty(1.5)).to.equal(false);
    });

    it('should not be emtpy, when obj is 0', function() {
      expect(Helper.isEmpty(0)).to.equal(true);
    });

    it('should be emtpy, when obj is a empty regexp/object/string/array or false value', function() {
      expect(Helper.isEmpty(new RegExp())).to.equal(true);
      expect(Helper.isEmpty('')).to.equal(true);
      expect(Helper.isEmpty({})).to.equal(true);
      expect(Helper.isEmpty([])).to.equal(true);
      expect(Helper.isEmpty(false)).to.equal(true);
    });
  });

  describe('#isPresent(obj)', function() {
    it('should be present, when obj is a number', function() {
      expect(Helper.isPresent(1)).to.equal(true);
      expect(Helper.isPresent(-1)).to.equal(true);
      expect(Helper.isPresent(1.5)).to.equal(true);
    });

    it('should be present, when obj is 0', function() {
      expect(Helper.isPresent(0)).to.equal(false);
    });

    it('should not be present, when obj is a empty regexp/object/string/array or false value', function() {
      expect(Helper.isPresent(new RegExp())).to.equal(false);
      expect(Helper.isPresent('')).to.equal(false);
      expect(Helper.isPresent({})).to.equal(false);
      expect(Helper.isPresent([])).to.equal(false);
      expect(Helper.isPresent(false)).to.equal(false);
    });
  });
});
