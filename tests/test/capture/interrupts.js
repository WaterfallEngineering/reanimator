/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');

describe('Reanimator interposes on timer interrupts', function () {
  var build = require('../../util/hooks').build;
  var url = 'http://localhost:' + process.env.FIXTURE_PORT + '/index.html';
  var driver;

  var setTimeout = this.setTimeout;

  beforeEach(function (done) {
    build().then(function (builtDriver) {
      driver = builtDriver;
      done();
    });
  });

  afterEach(function () {
    driver.quit();
  });

  describe('setTimeout', function () {
    it('events are captured when fired', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (callback) {
            Reanimator.capture();

            setTimeout(function () {
              Date.now();
            }, 0);
            setTimeout(function () {
              Date.now();
              Reanimator.cleanUp();

              callback(JSON.stringify(Reanimator.flush()));
            }, 100);
            setTimeout(function () {
              Date.now();
            }, 50);
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.events.length).to.be(3);

          var expectedOrder = [0, 2, 1];
          var event;
          for (var i = 0; i < expectedOrder.length; i++) {
            event = result.events[i];

            expect(event.type).to.be('setTimeout');
            expect(event.id).to.be(expectedOrder[i]);
            expect(event.time).to.be.above(result.dates[i] - 5);
            expect(event.time).to.be.below(result.dates[i] + 5);
          }

          done();
        });
    });

    it('cleared timeouts are not captured', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (callback) {
            Reanimator.capture();

            setTimeout(function () {
              clearTimeout(h);
              Date.now();
            }, 0);
            setTimeout(function () {
              Date.now();
              Reanimator.cleanUp();

              callback(JSON.stringify(Reanimator.flush()));
            }, 100);
            var h = setTimeout(function () {
              Date.now();
            }, 50);
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.events.length).to.be(2);

          var expectedOrder = [0, 1];
          var event;
          for (var i = 0; i < expectedOrder.length; i++) {
            event = result.events[i];

            expect(event.type).to.be('setTimeout');
            expect(event.id).to.be(expectedOrder[i]);
            expect(event.time).to.be.above(result.dates[i] - 5);
            expect(event.time).to.be.below(result.dates[i] + 5);
          }

          done();
        });
    });
  });

  describe('setInterval', function () {
    it('events are captured when fired', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (callback) {
            var i = 0;

            Reanimator.capture();
            setInterval(function () {
              Date.now();
              i++;

              if (i >= 5) {
                Reanimator.cleanUp();
                callback(JSON.stringify(Reanimator.flush()));
              }
            },  100);
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.events.length).to.be(5);

          var event;
          for (var i = 0; i < result.events.length; i++) {
            event = result.events[i];

            expect(event.type).to.be('setInterval');
            expect(event.id).to.be(0);
            expect(event.time).to.be.above(result.dates[i] - 5);
            expect(event.time).to.be.below(result.dates[i] + 5);
          }

          done();
        });
    });

    it('cleared timeouts are not captured', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (callback) {
            var i = 0;
            var h;

            setTimeout(function () {
              clearInterval(h);
            }, 200);

            setTimeout(function () {
              Reanimator.cleanUp();
              callback(JSON.stringify(Reanimator.flush()));
            }, 400);

            Reanimator.capture();
            h = setInterval(function () {
              Date.now();
              i++;

              if (i > 1) {
              }
            },  100);
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.events.length).to.be.above(0);
          expect(result.events.length).to.be.below(5);

          var event;
          for (var i = 0; i < result.events.length; i++) {
            event = result.events[i];

            expect(event.type).to.be('setInterval');
            expect(event.id).to.be(0);
            expect(event.time).to.be.above(result.dates[i] - 5);
            expect(event.time).to.be.below(result.dates[i] + 5);
          }

          done();
        });
    });
  });
});
