var util = require('util');

var Entity = require('../../../lib/entity');

var UserEntity = new Entity({
  username: true,
  age: true,
  description: { as: 'selfIntroduction' },
  fullname: function(obj) {
    return util.format('%s %s', obj.firstName || '', obj.lastName || '');
  },
  isAdult: function(obj) {
    return obj.age >= 18 ? true : false;
  },
  hasCreditCard: function(obj) {
    return obj.creditCard ? true : false;
  },
  nation: { value: 'China' },
  gender: { default: 'unknown' }
});

module.exports = UserEntity;
