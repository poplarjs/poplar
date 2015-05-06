var chai = require('chai');
var _ = require('lodash');

var Entity = require('../lib/entity');

var expect = chai.expect;

describe('Entity', function() {

  var SomeEntity, SomeOtherEntity;

  beforeEach(function() {
    SomeEntity = new Entity();
    SomeOtherEntity = new Entity();
  })

  describe('#isEntity(obj)', function() {

    it('should be true if obj is an Entity', function() {
      expect(Entity.isEntity(SomeEntity)).to.equal(true);
      expect(SomeEntity.isEntity()).to.equal(true);
    });

    it('should be false if obj is not an Entity', function() {
      expect(Entity.isEntity('string')).to.equal(false);
      expect(Entity.isEntity(1)).to.equal(false);
      expect(Entity.isEntity(false)).to.equal(false);
      expect(Entity.isEntity(true)).to.equal(false);
      expect(Entity.isEntity({})).to.equal(false);
    });
  });

  describe('#add()', function() {

    it('should add multi-attribute', function() {
      var fn = function(){ SomeEntity.add('name', 'age', 'gender') };
      expect(fn).to.not.throw(Error);
    });

    it('should add multi-attribute with :value option', function() {
      var fn = function(){ SomeEntity.add('name', 'age', 'gender', { value: 15 }) };
      expect(fn).to.not.throw(Error);
    });

    it('should add multi-attribute with :if option', function() {
      var fn = function(){ SomeEntity.add('name', 'age', 'gender', { if: function(obj){ return obj.age > 15 } }) };
      var fnError = function(){ SomeEntity.add('name', 'age', 'gender', { if: 'ifcondition' }) };
      expect(fn).to.not.throw(Error);
      expect(fnError).to.throw(Error);
    });

    it('should add multi-attribute with :using option', function() {
      var fn = function(){ SomeEntity.add('name', 'age', 'gender', { using: SomeOtherEntity }) };
      var fnError = function(){ SomeEntity.add('name', 'age', 'gender', { using: function(obj){ return obj.age > 15 } }) };
      expect(fn).to.not.throw(Error);
      expect(fnError).to.throw(Error);
    });

    it('should add multi-attribute with :default option', function() {
      var fn = function(){ SomeEntity.add('name', 'age', 'gender', { default: SomeOtherEntity }) };
      expect(fn).to.not.throw(Error);
    });

    it('should add one attribute with options or function', function() {

      var fn = function() {
        SomeEntity.add('name1', { using: SomeOtherEntity, as: 'fullName' });
        SomeEntity.add('name2', { value: 15 });
        SomeEntity.add('name3', { default: 20 });
        SomeEntity.add('name4', { default: 20 }, function(obj, options) {
          return obj.name && obj.name + '-GreatMan';
        });
        SomeEntity.add('name5', { default: 20, using: SomeOtherEntity }, function(obj, options) {
          return obj.name && obj.name + '-GreatMan';
        });
      };

      expect(fn).to.not.throw(Error);

    });

    it('should throw an error when use function for multi-attribute', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', function(obj){ return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :as option for multi-attribute', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', { as: 'myName' });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :as option with function', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', { as: 'myName' }, function(obj) { return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :value option with function', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', { value: 'myNameValue' }, function(obj) { return obj; });
      };

      expect(fn).to.throw(Error);
    });

    it('should throw an error when use :value option with :as option', function() {
      var fn = function() {
        SomeEntity.add('name', 'age', 'gender', { value: 'myNameValue', as: 'myName' });
      };

      expect(fn).to.throw(Error);
    });

  });

  describe('#expose()', function() {
    it('should have the same functionalities of #add()', function() {
      expect(SomeEntity.expose.toString()).to.equal(SomeEntity.add.toString());
    });
  })

  describe('#parse(input, options, converter)', function() {

  });

})
