function RerunFormatter(options) {
  var Cucumber = require('../../cucumber');
  var path = require('path');
  var _ = require('lodash');

  var self = Cucumber.Listener.Formatter(options);
  var statsJournal = Cucumber.Listener.StatsJournal();
  var failures = {};

  var parentHear = self.hear;
  self.hear = function hear(event, callback) {
    statsJournal.hear(event, function () {
      parentHear(event, callback);
    });
  };

  self.handleAfterScenarioEvent = function handleAfterScenarioEvent(event, callback) {
    var isCurrentScenarioFailing = statsJournal.isCurrentScenarioFailing();

    if (isCurrentScenarioFailing) {
      var failedScenario = event.getPayloadItem('scenario');
      var uri = path.relative(process.cwd(), failedScenario.getUri());
      var line = failedScenario.getLine();
      if (!failures[uri]) {
        failures[uri] = [];
      }
      failures[uri].push(line);
    }
    callback();
  };

  self.handleAfterFeaturesEvent = function handleAfterFeaturesEvent(event, callback) {
    var featurePaths = _.map(failures, function(lines, uri) {
      return uri + ':' + lines.join(':')
    });
    self.log(featurePaths.join('\n'));
    self.finish(callback);
  };

  return self;
}

module.exports = RerunFormatter;
