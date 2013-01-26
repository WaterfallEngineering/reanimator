/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');

describe('Reanimator replays captured Dates', function () {
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

  it('Date.now', function (done) {
    var dates = [ 23, 42, 23251 ];

    driver.get(url).
      then(function () {
        return driver.executeScript(function (dates) {
          Reanimator.replay({
            dates: dates,
            events: []
          });

          return [Date.now(), Date.now(), Date.now()];
        }, dates);
      }).
      then(function (result) {
        expect(result).to.eql(dates);
        done();
      });
  });

  it('new Date()', function (done) {
    var dates = [ 23, 42, 23251 ];

    driver.get(url).
      then(function () {
        return driver.executeScript(function (dates) {
          var expectedString = (new Date(23)).toUTCString();
          Reanimator.replay({
            dates: dates,
            events: []
          });

          var result = [new Date(), new Date(), new Date()];

          result[0].getTime();
          return {
            methodsOk: expectedString === result[0].toUTCString(),
            allDateInstances: result.reduce(function (prev, curr) {
              return prev && curr instanceof Date;
            }, true),
            values: result.map(function (v) {
              return v.valueOf();
            })
          };
        }, dates);
      }).
      then(function (result) {
        expect(result.methodsOk).to.be(true);
        expect(result.allDateInstances).to.be(true);
        expect(result.values).to.eql(dates);
        done();
      });
  });

  it('new Date(/* something */)', function (done) {
    var dates = [ 23, 42, 23251 ];

    driver.get(url).
      then(function () {
        return driver.executeScript(function (dates) {
          Reanimator.replay({
            dates: dates,
            events: []
          });

          var result =
            [new Date(123), new Date(), new Date(321), new Date(), new Date()];

          return [ result.reduce(function (prev, curr) {
            return prev && curr instanceof Date;
          }, true)].concat(result.map(function (v) {
            return v.valueOf();
          }));
        }, dates);
      }).
      then(function (result) {
        dates.splice(0, 0, 123);
        dates.splice(2, 0, 321);
        expect(result.slice(1)).to.eql(dates);
        done();
      });
  });

  it('Date()', function (done) {
    var dates = [ 23, 42, 23251 ];

    driver.get(url).
      then(function () {
        return driver.executeScript(function (dates) {
          Reanimator.replay({
            dates: dates,
            events: []
          });

          var result = [Date(), Date(), Date()];

          return result;
        }, dates);
      }).
      then(function (result) {
        expect(result).to.eql(dates.map(function (v) {
          return (new Date(v)).toString();
        }));
        done();
      });
  });
});
