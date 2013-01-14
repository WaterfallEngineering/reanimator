/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');
var _ = require('lodash');

describe('Reanimator replays captured calls to Math.random', function () {
  var build = require('../../util/hooks').build;
  var url = 'http://localhost:' + process.env.FIXTURE_PORT + '/index.html';
  var driver;

  beforeEach(function (done) {
    build().then(function (builtDriver) {
      driver = builtDriver;
      done();
    });
  });

  afterEach(function () {
    driver.quit();
  });

  it('Math.random', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var result;
          var expected = [0.23, 0.42, 0.23251];
          Reanimator.replay({
            dates: [],
            random: expected,
            events: []
          });

          result = [Math.random(), Math.random(), Math.random()];

          Reanimator.cleanUp();
          return {
            expected: expected,
            actual: result
          };
        });
      }).
      then(function (result) {
        expect(result.actual).to.eql(result.expected);
        done();
      });
  });
});
