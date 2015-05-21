var chai = require('chai');
var util = require('util');

var Dynamic = require('../lib/dynamic');

var expect = chai.expect;

describe('Dynamic', function() {
  describe('#define(name, converter)', function() {
    var testConverter;
    beforeEach(function() {
      testConverter = function(val) {
        return Number(val) + 1;
      };
      Dynamic.define('addOne', testConverter);
    });

    afterEach(function() {
      Dynamic.undefine('addOne');
    });

    it('should be able to add a new converter', function() {
      expect(Dynamic.getConverter('addOne').toString()).to.equal(testConverter.toString());
    });

    it('should be able convertable if specific converter exists', function() {
      expect(Dynamic.canConvert('addOne')).to.equal(true);
      expect(Dynamic.canConvert('regexp')).to.equal(false);
    });

    it('should be converted as number and add 1 as result', function() {
      var result = new Dynamic('12').to('addOne');
      expect(result).to.equal(13);
      expect(typeof result).to.equal('number');
    });

    it('should be converted as number', function() {
      expect(new Dynamic('123').to('number')).to.equal(123);
      expect(new Dynamic('-123').to('number')).to.equal(-123);
      expect(new Dynamic('-123.1.1').to('number')).to.be.a('number');
    });

    it('should be converted as boolean', function() {
      expect(new Dynamic(true).to('boolean')).to.equal(true);
      expect(new Dynamic('true').to('boolean')).to.equal(true);
      expect(new Dynamic('boolean?').to('boolean')).to.equal(true);
      expect(new Dynamic('').to('boolean')).to.equal(false);
      expect(new Dynamic(false).to('boolean')).to.equal(false);
      expect(new Dynamic('undefined').to('boolean')).to.equal(false);
      expect(new Dynamic('null').to('boolean')).to.equal(false);
      expect(new Dynamic('false').to('boolean')).to.equal(false);
    });
  });
});
