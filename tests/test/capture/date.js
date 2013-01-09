/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');

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
        return driver.executeAsyncScript(asyncTrialRunner, function () {
            this.times = this.times || [];
            this.times.push(Date.now());
          }, {
            numTrials: 3
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
        return driver.executeAsyncScript(asyncTrialRunner, function () {
            this.times = this.times || [];
            this.times.push(Date.parse(new Date()));
          }, {
            numTrials: 3
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
        return driver.executeAsyncScript(asyncTrialRunner, function () {
            this.times = this.times || [];
            this.times.push(Date.parse(Date()));
          }, {
            numTrials: 3
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
