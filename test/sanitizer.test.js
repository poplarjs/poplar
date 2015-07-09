var chai = require('chai');
var util = require('util');
var expect = chai.expect;

var Sanitize = require('../lib/sanitizer');

Sanitize.extend('toUpperCase', function(val, params) {
  return String(val).toUpperCase();
});

describe('Sanitize()', function() {
  var sanitizers = [
    { arg: 'name',
      sanitizes: {
        trim: true,
        toUpperCase: true
      }
    },
    { arg: 'trimLeft',
      sanitizes: {
        ltrim: true
      }
    },
    {
      arg: 'email',
      sanitizes: {
        trim: true,
        uppercase: true,
        normalizeEmail: true
      }
    },
    {
      arg: 'score',
      sanitizes: {
        toFloat: true
      }
    },
    {
      arg: 'introduction',
      sanitizes: {
        xss: true
      }
    }
  ];

  it('should return sanitized args', function() {
    var args = Sanitize({
      name: ' Feli ',
      trimLeft: ' Hello',
      email: ' myEmail@gmail.com ',
      score: '1.1',
      introduction: '<a href="#" onclick="alert(/xss/)">click me</a>'
    }, sanitizers);

    expect(args).to.have.property('name', 'FELI');
    expect(args).to.have.property('trimLeft', 'Hello');
    expect(args).to.have.property('email', 'myemail@gmail.com');
    expect(args).to.have.property('score', 1.1);
    expect(args).to.have.property('introduction', '<a href="#">click me</a>');
  });

});
