/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');

describe('Reanimator interposes on Date', function () {
  var build = require('../../util/hooks').build;
  var driver;

  beforeEach(function (done) {
    build({
      server:
        'http://localhost:' + process.env.DRIVER_PORT + '/wd/hub',
      capabilities: {
        'browserName': 'chrome',
        'version': '',
        'platform': 'ANY',
        'javascriptEnabled': true
      }
    }).then(function (builtDriver) {
      driver = builtDriver;
      done();
    });
  });

  afterEach(function () {
    driver.quit();
  });

  it('captures calls to Date.now', function (done) {
    driver.get('http://localhost:' + process.env.FIXTURE_PORT + '/index.html').
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var times = [];
          var n = 5;

          function runTrial() {
            if (times.length < n) {
              times.push(Date.now());
              setTimeout(runTrial, 10);
            } else {
              Reanimator.cleanUp();
              callback(JSON.stringify({
                times: times,
                log: Reanimator.flush()
              }));
            }
          }

          Reanimator.capture();
          setTimeout(runTrial, 10);
        });
      }).
      then(function (result) {
        result = JSON.parse(result);

        expect(result.log.dates.length).to.be(result.times.length);

        expect(result.log.dates).to.eql(result.times);
        done();
      });
  });

  it('captures calls to Date as a constructor with no args', function (done) {
    driver.get('http://localhost:' + process.env.FIXTURE_PORT + '/index.html').
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var times = [];
          var n = 5;

          function runTrial() {
            if (times.length < n) {
              times.push(Date.parse(new Date()));
              setTimeout(runTrial, 10);
            } else {
              Reanimator.cleanUp();
              callback(JSON.stringify({
                times: times,
                log: Reanimator.flush()
              }));
            }
          }

          Reanimator.capture();
          setTimeout(runTrial, 10);
        });
      }).
      then(function (result) {
        result = JSON.parse(result);

        expect(result.log.dates.length).to.be(result.times.length);

        expect(result.log.dates).to.eql(result.times);
        done();
      });
  });

  it('does not capture calls to Date as a constructor with args',
    function (done) {
      driver.get('http://localhost:' + process.env.FIXTURE_PORT + '/index.html').
        then(function () {
          return driver.executeScript(function () {
            Reanimator.capture();
            new Date(2013);
            Reanimator.cleanUp();
            return JSON.stringify(Reanimator.flush());
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.dates.length).to.be(0);
          done();
        });
    });

  it('captures calls to Date as a function', function (done) {
    driver.get('http://localhost:' + process.env.FIXTURE_PORT + '/index.html').
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var times = [];
          var n = 5;

          function runTrial() {
            if (times.length < n) {
              times.push(Date.parse(Date()));
              setTimeout(runTrial, 10);
            } else {
              Reanimator.cleanUp();
              callback(JSON.stringify({
                times: times,
                log: Reanimator.flush()
              }));
            }
          }

          Reanimator.capture();
          setTimeout(runTrial, 10);
        });
      }).
      then(function (result) {
        result = JSON.parse(result);

        expect(result.log.dates.length).to.be(result.times.length);

        expect(result.log.dates).to.eql(result.times);
        done();
      });
  });
});
