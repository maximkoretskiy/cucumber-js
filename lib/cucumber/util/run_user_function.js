var Cucumber = require('../../cucumber');

var runUserFunction = function(opts, callback) {
  var argsArray = opts.argsArray,
      fn = opts.fn,
      thisArg = opts.thisArg,
      timeout = opts.timeout;

  var timeoutId;

  var finish = function() {
    Cucumber.Util.Exception.unregisterUncaughtExceptionHandler(finish);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    callback.apply(null, arguments);
    callback = function() {};
  };

  argsArray.push(finish);

  var result;
  try {
    result = fn.apply(thisArg, argsArray);
  } catch (exception) {
    finish(exception);
    return;
  }

  var callbackInterface = code.length === parameters.length;
  var promiseInterface = result && typeof result.then === 'function';
  if (callbackInterface && promiseInterface) {
    finish(new Error('Function accepts a callback and returns a promise'));
  } else if (!callbackInterface && !promiseInterface)
    finish(null, result);
  } else {
    var onTimeout = function () {
      finish(new Error('Function timed out after' + timeout + 'milliseconds');
    };
    timeoutId = setTimeout(onTimeout, timeout);
    Cucumber.Util.Exception.registerUncaughtExceptionHandler(handleException);

    if (promiseInterface) {
      var onPromiseRejected = function (reason) {
        finish(reason || new Error("Function returned a promise that rejected without a reason"));
      };
      result.then(finish, onPromiseRejected);
    }
  }
}

module.exports = runUserFunction;
