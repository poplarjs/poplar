var chai = require('chai');
var util = require('util');
var expect = chai.expect;

var StateManager = require('../lib/state_manager');

describe('StateManager(stateName, stateParams)', function() {
  it('should return a state with initial state and stateParams', function() {
    var state = new StateManager();
    expect(state).to.have.property('_state', 'initial');
  });
});

describe('StateManager.init(stateName, stateParams)', function() {
  it('should return a state with initial state and stateParams', function() {
    var state = StateManager.init();
    expect(state).to.have.property('_state', 'initial');
  });
});

describe('StateManager.prototype', function() {
  var state;
  beforeEach(function() {
    state = new StateManager();
  });

  describe('#is(stateName)', function() {
    it('should return true if stateName is current state', function() {
      expect(state.is('initial')).to.be.true;
      state.transitionTo('anotherState');
      expect(state.is('anotherState')).to.be.true;
    });

    it('should return false if stateName is not current state', function() {
      expect(state.is('notInitial')).to.be.false;
      state.transitionTo('anotherState');
      expect(state.is('notAnotherState')).to.be.false;
    });

    it('should return true if stateName is a matched wildcard', function() {
      state.transitionTo('before.users.signin');
      expect(state.is('before.*')).to.be.true;
    });

    it('should return false if stateName is an unmatched wildcard', function() {
      state.transitionTo('before.users.signin');
      expect(state.is('after.*')).to.be.false;
    });
  });

  describe('#transitionTo(stateName, stateParams)', function() {
    it('should transitionTo another state with corresponding event being emitted', function(done) {
      state.transitionTo('signup', { name: 'Felix Liu', username: 'lyfeyaj' });

      state.on('change', function(previousState, currentState, previousStateParams, currentStateParams) {
        expect(previousState).to.equals('signup');
        expect(previousStateParams).to.have.property('name', 'Felix Liu');
        expect(previousStateParams).to.have.property('username', 'lyfeyaj');

        expect(currentState).equals('signin');
        expect(currentStateParams).to.have.property('isLogin', true);
        done();
      });

      state.transitionTo('signin', { isLogin: true });
      expect(state.is('signin')).to.be.true;
    });
  });
});
