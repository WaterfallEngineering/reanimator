/* vim: set et ts=2 sts=2 sw=2: */
var expect = require('expect.js');

describe('Reanimator captures DOMContentLoaded', function () {
  var build = require('../../util/hooks').build;
  var url = 'http://localhost:' + process.env.FIXTURE_PORT +
    '/dom-content-loaded-capture.html';
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

  it('exactly once', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.cleanUp();
          return JSON.stringify({
            expected: window.expected,
            expectedTime: window.expectedTime,
            firedAll: window.firedSecond && window.firedThird,
            log: Reanimator.flush()
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        var events = result.log.events.filter(function (entry) {
          return entry.type === 'dom-content-loaded';
        });

        expect(events.length).to.be(1);
        expect(events[0].time).to.be.above(result.expectedTime - 5);
        expect(events[0].time).to.be.below(result.expectedTime + 5);
        expect(events[0].details.details).to.eql(result.expected);
        done();
      });
  });
});
