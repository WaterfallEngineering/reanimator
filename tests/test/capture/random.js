/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');

describe('Reanimator interposes on Math.random', function () {
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

  it('captures calls to Math.random', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var expected;
          
          Reanimator.capture();
          expected = [Math.random(), Math.random(), Math.random()];
          
          Reanimator.cleanUp();
          return {
            expected: expected,
            log: Reanimator.flush()
          };
        });
      }).
      then(function (result) {
        expect(result.log.random).to.eql(result.expected);
        done();
      });
  });
});
