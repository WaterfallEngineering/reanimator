/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');

describe('Reanimator interposes on Date', function () {
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

  it('captures calls to Date.now', function (done) {
    driver.get(url).
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

  describe('new Date()', function () {
    it('is captured', function (done) {
      driver.get(url).
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

    it('returns an instance of "Date"', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeScript(function () {
            Reanimator.capture();
            return (new Date()) instanceof Date;
          });
        }).
        then(function (result) {
          expect(result).to.be(true);
          done();
        });
    });
  });

  it('does not capture calls to Date as a constructor with args',
    function (done) {
      driver.get(url).
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
    driver.get(url).
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
