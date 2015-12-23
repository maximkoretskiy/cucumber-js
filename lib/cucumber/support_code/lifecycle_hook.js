function LifecycleHook(options, code, uri, line) {
  var Cucumber = require('../../cucumber');

  var self = Cucumber.SupportCode.StepDefinition('', options, code, uri, line);

  self.invoke: function invoke(defaultTimeout, callback) {
    var timeoutId;

    var finish = function finish(error) {
      Cucumber.Util.Exception.unregisterUncaughtExceptionHandler(handleException);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      callback(error);
      callback = function() {};
    };

    var codeCallback = self.buildCodeCallback(function (error) {
      finish(error);
    });

    var handleException = self.buildExceptionHandlerToCodeCallback(codeCallback);

    function onPromiseFulfilled() { codeCallback(); }
    function onPromiseRejected(error) {
      codeCallback(error || new Error(Cucumber.SupportCode.StepDefinition.UNKNOWN_STEP_FAILURE_MESSAGE));
    }

    var timeoutInMilliseconds = options.timeout || defaultTimeout;

    function initializeTimeout() {
      timeoutId = setTimeout(function(){
        codeCallback(new Error('Step timed out after ' + timeoutInMilliseconds + ' milliseconds'));
      }, timeoutInMilliseconds);
    }

    Cucumber.Util.Exception.registerUncaughtExceptionHandler(handleException);

    var parameters = [];
    var validCodeLengths = self.validCodeLengths(parameters);
    if (validCodeLengths.indexOf(code.length) === -1) {
      return codeCallback(new Error(self.invalidCodeLengthMessage(parameters)));
    }

    initializeTimeout();

    var result;
    try {
      result = code.apply(null, parameters);
    } catch (exception) {
      return handleException(exception);
    }

    var callbackInterface = code.length === parameters.length;
    var promiseInterface = result && typeof result.then === 'function';
    if (callbackInterface && promiseInterface) {
      codeCallback(new Error(self.getType() + ' accepts a callback and returns a promise'));
    } else if (promiseInterface) {
      result.then(onPromiseFulfilled, onPromiseRejected);
    } else if (!callbackInterface) {
      codeCallback();
    }
  };

  self.getType: function getType () {
    return 'lifecycle hook';
  };

  return self;
}

module.exports = StepDefinition;
