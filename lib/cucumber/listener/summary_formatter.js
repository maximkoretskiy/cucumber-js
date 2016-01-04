function SummaryFormatter(options) {
  var Cucumber = require('../../cucumber');
  var Duration = require('duration');
  var Table    = require('cli-table');
  var path     = require('path');
  var _        = require('lodash');

  var failures = [];
  var warnings = [];
  var statsJournal = Cucumber.Listener.StatsJournal();
  var colors = Cucumber.Util.Colors(options.useColors);
  var statusReportOrder = [
    Cucumber.Status.FAILED,
    Cucumber.Status.UNDEFINED,
    Cucumber.Status.AMBIGUOUS,
    Cucumber.Status.PENDING,
    Cucumber.Status.SKIPPED,
    Cucumber.Status.PASSED
  ];

  function indent(text, level) {
    var indented;
    text.split('\n').forEach(function (line) {
      var prefix = new Array(level + 1).join('  ');
      line = (prefix + line).replace(/\s+$/, '');
      indented = (typeof(indented) === 'undefined' ? line : indented + '\n' + line);
    });
    return indented;
  }

  var self = Cucumber.Listener.Formatter(options);

  var parentHear = self.hear;
  self.hear = function hear(event, callback) {
    statsJournal.hear(event, function () {
      parentHear(event, callback);
    });
  };

  self.handleStepResultEvent = function handleStepResult(event, callback) {
    var stepResult = event.getPayloadItem('stepResult');
    var status = stepResult.getStatus();
    switch (status) {
      case Cucumber.Status.AMBIGUOUS:
        self.storeAmbiguousStepResult(stepResult);
        break;
      case Cucumber.Status.FAILED:
        self.storeFailedStepResult(stepResult);
        break;
      case Cucumber.Status.UNDEFINED:
        self.storeUndefinedStepResult(stepResult);
        break;
    }
    callback();
  };

  self.handleAfterFeaturesEvent = function handleAfterFeaturesEvent(event, callback) {
    self.logSummary();
    self.finish(callback);
  };

  self.storeAmbiguousStepResult = function storeAmbiguousStepResult(stepResult) {
    var stepDefinitions = stepResult.getAmbiguousStepDefinitions();

    var table = new Table({
      chars: {
        'bottom': '', 'bottom-left': '', 'bottom-mid': '', 'bottom-right': '',
        'left': '', 'left-mid': '',
        'mid': '', 'mid-mid': '',
        'middle': ' ',
        'right': '', 'right-mid': '',
        'top': '' , 'top-left': '', 'top-mid': '', 'top-right': ''
      },
      style: {
        'padding-left': 0, 'padding-right': 0
      }
    });
    table.push.apply(table, stepDefinitions.map(function (stepDefinition) {
      var pattern = stepDefinition.getPattern();
      var relativeUri = path.relative(process.cwd(), stepDefinition.getUri());
      var line = stepDefinition.getLine();
      return [colors.ambiguous(pattern), colors.comment('# ' + relativeUri + ':' + line)];
    }));
    failures.push({
      stepResult: stepResult,
      message: 'Multiple step definitions match:' + '\n' + indent(table.toString(), 1)
    });
  };

  self.storeFailedStepResult = function storeFailedStepResult(stepResult) {
    var failureException = stepResult.getFailureException();
    failures.push({
      stepResult: stepResult,
      message: failureException.stack || failureException
    });
  };

  self.storeUndefinedStepResult = function storeUndefinedStepResult(stepResult) {
    var step = stepResult.getStep();
    var snippetBuilder = Cucumber.SupportCode.StepDefinitionSnippetBuilder(step, options.snippetSyntax);
    var snippet = snippetBuilder.buildSnippet();
    warnings.push({
      stepResult: stepResult,
      message: 'Undefined. Implement with the following snippet:' + '\n' + indent(snippet, 1)
    });
  };

  self.logSummary = function logSummary() {
    if (failures.length > 0)
      self.logFailures();

    if (warnings.length > 0)
      self.logWarnings();

    self.logScenariosSummary();
    self.logStepsSummary();
    self.logDuration();
  };

  self.logFailures = function logFailures() {
    self.log(colors.failed('Failures:') + '\n\n');
    failures.forEach(function(failure, index) {
      self.logIssue(index + 1, failure.stepResult, failure.message, colors.failed);
    });
  };

  self.logWarnings = function logWarnings() {
    self.log(colors.pending('Warnings:') + '\n\n');
    warnings.forEach(function(warning, index) {
      self.logIssue(index + 1, warning.stepResult, warning.message, colors.pending);
    });
  };

  self.logIssue = function logIssue(number, stepResult, message, colorFn) {
    var step = stepResult.getStep();
    var scenario = step.getScenario();
    var scenarioTitle = scenario.getKeyword() + ': ' + scenario.getName();
    var scenarioLocation = path.relative(process.cwd(), scenario.getUri()) + ':' + scenario.getLine();
    var line1 = number + ') ' + scenarioTitle + ' # ' + scenarioLocation;
    var line2 = step.getKeyword() + (step.getName() || '');
    if (stepResult.getStepDefinition()) {
      var stepDefintion = stepResult.getStepDefinition();
      var stepDefintionLocation = path.relative(process.cwd(), stepDefintion.getUri()) + ':' + stepDefintion.getLine();
      line2 += ' # ' + stepDefintionLocation;
    }
    var header = colorFn(line1 + '\n' + indent(line2, 1));
    self.log(header + '\n' + indent(message, 2) + '\n\n');
  };

  self.logFailedScenarios = function logFailedScenarios() {
    self.log('Failing scenarios:\n');
    var failedScenarios = self.getFailedScenarioLogBuffer();
    self.log(failedScenarios);
    self.log('\n');
  };

  self.logScenariosSummary = function logScenariosSummary() {
    self.logCountSummary('scenario', statsJournal.getScenarioCounts());
  };

  self.logStepsSummary = function logStepsSummary() {
    self.logCountSummary('step', statsJournal.getStepCounts());
  };

  self.logDuration = function logDuration() {
    var nanoseconds = statsJournal.getDuration();
    var milliseconds = Math.ceil(nanoseconds / 1e6);
    var start = new Date(0);
    var end = new Date(milliseconds);
    var duration = new Duration(start, end);

    self.log(duration.minutes + 'm' +
             duration.toString('%S') + '.' +
             duration.toString('%L') + 's' + '\n');
  };

  self.logUndefinedStepSnippets = function logUndefinedStepSnippets() {
    var undefinedStepLogBuffer = self.getUndefinedStepLogBuffer();
    if (options.snippets) {
      self.log(colors.pending('\nYou can implement step definitions for undefined steps with these snippets:\n\n'));
      self.log(colors.pending(undefinedStepLogBuffer));
    }
  };

  self.logCountSummary = function logCountSummary (type, counts) {
    var total = _.reduce(counts, function(memo, value){
      return memo + value;
    });

    self.log(total + ' ' + type + (total !== 1 ? 's' : ''));
    if (total > 0) {
      var details = [];
      statusReportOrder.forEach(function (status) {
        if (counts[status] > 0)
          details.push(colors[status](counts[status] + ' ' + status));
      });
      self.log(' (' + details.join(', ') + ')');
    }
    self.log('\n');
  };

  return self;
}

module.exports = SummaryFormatter;
