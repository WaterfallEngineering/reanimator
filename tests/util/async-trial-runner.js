/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */

module.exports = function asyncTrialRunner(trialFn, config, callback) {
    var setTimeout = window.setTimeout;

    trialFn = trialFn.replace(/^function \(\) \{/, '');
    trialFn = trialFn.replace(/\}$/, '');
    trialFn = new Function(trialFn);

    if (!callback) {
      callback = config;
      config = {};
    }

    function runTrialsAsync(config) {
      config = config || {};
      config.numTrials = config.numTrials || 5; // NOTE: defaults 0 -> 5
      config.delay = config.delay || 0;
      config.context = config.context || {};

      var trial = 0;

      function runTrial() {
        if (trial < config.numTrials) {
          trialFn.call(config.context);
          trial++;
          setTimeout(runTrial, config.delay);
        } else {
          Reanimator.cleanUp();
          config.context.log = Reanimator.flush();
          callback(JSON.stringify(config.context));
        }
      }

      Reanimator.capture();
      setTimeout(runTrial, 0);
    }

    setTimeout(runTrialsAsync, 0, config);
  };
