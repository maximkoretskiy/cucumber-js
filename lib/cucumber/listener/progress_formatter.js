function ProgressFormatter(suite, stream, options) {
  var Cucumber = require('../../cucumber');

  var colors = Cucumber.Util.Colors(options.useColors);

  Cucumber.Listener.SummaryFormatter(suite, stream, {
    snippets: options.snippets,
    snippetSyntax: options.snippetSyntax,
    useColors: options.useColors
  });

  var characters = {};
  characters[Cucumber.Status.FAILED] = 'F';
  characters[Cucumber.Status.PASSED] = '.';
  characters[Cucumber.Status.PENDING] = 'P';
  characters[Cucumber.Status.SKIPPED] = '-';
  characters[Cucumber.Status.UNDEFINED] = 'U';

  suite.on('stepResult', function (stepResult) {
    var status = stepResult.getStatus();
    var step = stepResult.getStep();
    if (!step.isHidden() || status === Cucumber.Status.FAILED) {
      var character = colors[status](characters[status]);
      self.log(character);
    }
  });
}

module.exports = ProgressFormatter;
