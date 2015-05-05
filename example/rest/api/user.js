var Poplar = requrie('../../../lib/api_builder');
var UserEntity = requrie('../entities/user');

var UserApi = new ApiBuilder();

UserApi.define('info', {
  accepts: [
    { arg: 'id', type: 'integer', validates: { require: true }, description: 'Get Username' }
  ],
  http: { path: 'info', verb: 'get' },
  returns: UserEntity
}, function(params, cb) {
  return {
    username: 'Felix Liu',
    age: 25,
    description: 'A programer who lives in Shanghai',
    firstName: 'Felix',
    lastName: 'Liu',
    creditCard: 88888888888888,
    gender: 'male'
  };
});

module.exports = UserApi;
