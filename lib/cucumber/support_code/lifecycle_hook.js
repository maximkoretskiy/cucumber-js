function LifecycleHook(code, options, uri, line) {
  var Cucumber = require('../../cucumber');
  var self = Cucumber.SupportCode.StepDefinition('', options, code, uri, line);

  self.matchesStepName = function matchesStepName() {
    return false;
  };

  self.buildInvocationParameters = function buildInvocationParameters(step, scenario, callback) {
    return [callback];
  };

  self.validCodeLengths = function validCodeLengths (parameters) {
    return [parameters.length - 1, parameters.length];
  };

  self.invalidCodeLengthMessage = function invalidCodeLengthMessage() {
    return self.buildInvalidCodeLengthMessage('0', '1');
  };

  self.getType = function getType () {
    return 'lifecycle hook';
  };

  return self;
}

module.exports = LifecycleHook;
