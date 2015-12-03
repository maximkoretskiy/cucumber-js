function Library(supportCodeDefinition) {
  var Cucumber = require('../../cucumber');
  var callsite = require('callsite');

  var listeners        = [];
  var stepDefinitions  = [];
  var aroundHooks      = [];
  var beforeHooks      = [];
  var afterHooks       = [];
  var beforeAllHooks   = [];
  var afterAllHooks    = [];
  var World            = function World() {};
  var defaultTimeout   = 5 * 1000;

  var self = {
    lookupAroundHooksByScenario: function lookupBeforeHooksByScenario(scenario) {
      return self.lookupHooksByScenario(aroundHooks, scenario);
    },

    lookupBeforeHooksByScenario: function lookupBeforeHooksByScenario(scenario) {
      return self.lookupHooksByScenario(beforeHooks, scenario);
    },

    lookupAfterHooksByScenario: function lookupBeforeHooksByScenario(scenario) {
      return self.lookupHooksByScenario(afterHooks, scenario);
    },

    lookupHooksByScenario: function lookupHooksByScenario(hooks, scenario) {
      return hooks.filter(function (hook) {
        return hook.appliesToScenario(scenario);
      });
    },

    lookupStepDefinitionsByName: function lookupStepDefinitionsByName(name) {
      return stepDefinitions.filter(function (stepDefinition) {
        return stepDefinition.matchesStepName(name);
      });
    },

    defineLifecycleHook: function (collection) {
      return function(options, code) {
        if (typeof(options) === 'function') {
          code = options;
          options = {};
        }
        var site = callsite();
        var line = site[1].getLineNumber();
        var uri = site[1].getFileName();
        var lifecycleHook = Cucumber.SupportCode.LifecycleHook(code, options, uri, line);
        collection.push(lifecycleHook);
      };
    },

    defineHook: function defineHook(builder, collection) {
      return function() {
        var tagGroupStrings = Cucumber.Util.Arguments(arguments);
        var code = tagGroupStrings.pop();
        var site = callsite();
        var line = site[1].getLineNumber();
        var uri = site[1].getFileName();
        var hook = builder(code, {tags: tagGroupStrings}, uri, line);
        collection.push(hook);
      };
    },

    defineStep: function defineStep(name, options, code) {
      if (typeof(options) === 'function') {
        code = options;
        options = {};
      }
      var site = callsite();
      var line = site[1].getLineNumber();
      var uri = site[1].getFileName();
      var stepDefinition = Cucumber.SupportCode.StepDefinition(name, options, code, uri, line);
      stepDefinitions.push(stepDefinition);
    },

    getListeners: function getListeners() {
      return listeners;
    },

    instantiateNewWorld: function instantiateNewWorld() {
      return new World();
    },

    getDefaultTimeout: function getDefaultTimeout() {
      return defaultTimeout;
    },

    setDefaultTimeout: function setDefaultTimeout(milliseconds) {
      defaultTimeout = milliseconds;
    }
  };

  var supportCodeHelper = {
    BeforeAll         : self.defineLifecycleHook(beforeAllHooks),
    AfterAll          : self.defineLifecycleHook(afterAllHooks),
    Around            : self.defineHook(Cucumber.SupportCode.AroundHook, aroundHooks),
    Before            : self.defineHook(Cucumber.SupportCode.Hook, beforeHooks),
    After             : self.defineHook(Cucumber.SupportCode.Hook, afterHooks),
    Given             : self.defineStep,
    When              : self.defineStep,
    Then              : self.defineStep,
    defineStep        : self.defineStep,
    setDefaultTimeout : self.setDefaultTimeout,
    World             : World
  };

  supportCodeDefinition.call(supportCodeHelper);
  World = supportCodeHelper.World;

  return self;
}

module.exports = Library;
