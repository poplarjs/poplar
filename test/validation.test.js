var chai = require('chai');
var util = require('util');
var expect = chai.expect;

var Validate = require('../lib/validation');

describe('Validate()', function() {
  var validations = [
    { arg: 'name',
      required: 'name is required',
      validates: {
        required: { message: 'this message will be overwrited' },
        isLength: { args: [5, 15], message: 'name must longer than 5 and less than 15' }
      }
    },
    {
      arg: 'age',
      validates: {
        isInt: true,
        largerThan20: function(val) {
          if (val > 20) return;
          return 'age should larger than 20';
        }
      }
    },
    {
      arg: 'email',
      validates: {
        isEmail: { message: 'email is not valid' }
      }
    },
    {
      arg: 'score',
      validates: {
        isFloat: { message: 'score is not a valid float' }
      }
    },
    {
      arg: 'number',
      required: true,
      validates: {
        isInt: true
      }
    },
    {
      arg: 'conditionParam',
      validates: {
        required: function(val, params) {
          if (!params.number) return;
          if (val) return;
          return 'conditionParam is required';
        }
      }
    }
  ];

  it('should return error, if required parameter is empty', function() {
    var errors = Validate({}, validations);
    expect(errors.asJSON()).to.have.property('name');
    expect(errors.any()).to.equal(true);
    expect(errors.asJSON()).to.have.deep.property('name.required', 'name is required');
    expect(errors.flatten()).to.eql(["name is required", "number: 'required' validation failed"]);
    expect(errors.toHuman()).to.eql("name is required; number: 'required' validation failed");
  });

  it('should return error, if age is present and less than 20', function() {
    var errors = Validate({ age: 18, number: 1 }, validations);
    expect(errors.asJSON()).to.have.property('age');
    expect(errors.asJSON()).to.have.deep.property('age.largerThan20', 'age should larger than 20');
    expect(errors.asJSON()).to.have.deep.property('conditionParam.required', 'conditionParam is required');
    expect(errors.asJSON()).to.not.have.property('number');
  });

  it('should return errors, if validations are failed', function() {
    var errors = Validate({ name: 'Feli', age: 21, email: 'myEmail', score: '1.1.1', number: 'number' }, validations);
    expect(errors.asJSON()).to.have.property('name');
    expect(errors.asJSON()).to.have.deep.property('name.isLength');
    expect(errors.asJSON()).to.have.property('email');
    expect(errors.asJSON()).to.have.deep.property('email.isEmail');
    expect(errors.asJSON()).to.have.property('score');
    expect(errors.asJSON()).to.have.deep.property('score.isFloat');
    expect(errors.asJSON()).to.have.property('number');
    expect(errors.asJSON()).to.have.deep.property('number.isInt');
    expect(errors.asJSON()).to.not.have.deep.property('number.required');
  });

  it('should contains all the validators', function() {
    [
      'contains',
      'equals',
      'isAfter',
      'isAlpha',
      'isAlphanumeric',
      'isAscii',
      'isBase64',
      'isBefore',
      'isBoolean',
      'isByteLength',
      'isCreditCard',
      'isCurrency',
      'isDate',
      'isDivisibleBy',
      'isEmail',
      'isFQDN',
      'isFloat',
      'isFullWidth',
      'isHalfWidth',
      'isHexColor',
      'isHexadecimal',
      'isIP',
      'isISBN',
      'isISIN',
      'isIn',
      'isInt',
      'isJSON',
      'isLength',
      'isLowercase',
      'isMobilePhone',
      'isMongoId',
      'isMultibyte',
      'isNull',
      'isNumeric',
      'isSurrogatePair',
      'isURL',
      'isUUID',
      'isUppercase',
      'isVariableWidth',
      'matches'
    ].forEach(function(name) {
      expect(Validate.method(name)).to.be.a('function');
    });
  });

});
