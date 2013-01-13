/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');
var webdriver = require('../../../lib/selenium-webdriver/node/webdriver');

describe('Reanimator interposes on jQuery event handlers', function () {
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

  describe('click', function () {
    it('events are captured when fired', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeScript(function () {

            Reanimator.capture();
            $('#target').on('click', function (e) {
              window.expected =
                Reanimator.util.event.serialize(e.originalEvent);
              window.expectedTime = Date.now();
            });
          });
        }).
        then(function (result) {
          return driver.findElement(webdriver.By.css('#target')).click();
        }).
        then(function () {
          return driver.executeScript(function () {
            Reanimator.cleanUp();
            return JSON.stringify({
              log: Reanimator.flush(),
              expected: window.expected,
              expectedTime: window.expectedTime
            });
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.log.events.length).to.be(1);
          expect(result.log.events[0].type).to.be('jquery');
          expect(result.log.events[0].domEventType).to.be('MouseEvent');
          expect(result.log.events[0].time).
            to.be.above(result.expectedTime - 5);
          expect(result.log.events[0].time).
            to.be.below(result.expectedTime + 5);
          expect(result.log.events[0].details).to.eql(result.expected);
          done();
        });
    });

    it('events triggered programmatically are not captured', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeScript(function () {
            window.triggered = false;

            Reanimator.capture();
            $('#trigger-target').on('click', function (e) {
              window.triggered = true;
            });
            $('#target').on('click', function (e) {
              window.expected =
                Reanimator.util.event.serialize(e.originalEvent);
              window.expectedTime = Date.now();
              $('#trigger-target').click();
            });
          });
        }).
        then(function (result) {
          return driver.findElement(webdriver.By.css('#target')).click();
        }).
        then(function (result) {
          return driver.executeAsyncScript(function (callback) {
            setTimeout(function () {
              $('#trigger-target').click();
              callback();
            }, 0);
          });
        }).
        then(function () {
          return driver.executeScript(function () {
            Reanimator.cleanUp();
            return JSON.stringify({
              log: Reanimator.flush(),
              expected: window.expected,
              expectedTime: window.expectedTime,
              triggered: window.triggered
            });
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.log.events.length).to.be(2);

          expect(result.log.events[0].type).to.be('jquery');
          expect(result.log.events[0].domEventType).to.be('MouseEvent');
          expect(result.log.events[0].time).
            to.be.above(result.expectedTime - 5);
          expect(result.log.events[0].time).
            to.be.below(result.expectedTime + 5);
          expect(result.log.events[0].details).to.eql(result.expected);

          expect(result.log.events[1].type).to.be('setTimeout');

          expect(result.triggered).to.be(true);
          done();
        });
    });

    it('events are not captured after their handler is removed',
        function (done) {
          driver.get(url).
            then(function () {
              return driver.executeScript(function () {
                function handler(e) {
                  window.expected =
                    Reanimator.util.event.serialize(e.originalEvent);
                  window.expectedTime = Date.now();
                  $('#target').off('click', handler);
                }

                Reanimator.capture();
                $('#target').on('click', handler);
              });
            }).
            then(function (result) {
              return driver.findElement(webdriver.By.css('#target')).click();
            }).
            then(function (result) {
              return driver.findElement(webdriver.By.css('#target')).click();
            }).
            then(function () {
              return driver.executeScript(function () {
                Reanimator.cleanUp();
                return JSON.stringify({
                  log: Reanimator.flush(),
                  expected: window.expected,
                  expectedTime: window.expectedTime
                });
              });
            }).
            then(function (result) {
              result = JSON.parse(result);

              expect(result.log.events.length).to.be(1);
              expect(result.log.events[0].type).to.be('jquery');
              expect(result.log.events[0].domEventType).to.be('MouseEvent');
              expect(result.log.events[0].time).
                to.be.above(result.expectedTime - 5);
              expect(result.log.events[0].time).
                to.be.below(result.expectedTime + 5);
              expect(result.log.events[0].details).to.eql(result.expected);
              done();
            });
      });
    });

  describe('keydown', function () {
    it('events are captured when fired', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeScript(function () {

            Reanimator.capture();
            $('#key-target').on('keydown', function (e) {
              window.expected =
                Reanimator.util.event.serialize(e.originalEvent);
              window.expectedTime = Date.now();
            });
          });
        }).
        then(function (result) {
          return driver.
            findElement(webdriver.By.css('#key-target')).sendKeys('x');
        }).
        then(function () {
          return driver.executeScript(function () {
            Reanimator.cleanUp();
            return JSON.stringify({
              log: Reanimator.flush(),
              expected: window.expected,
              expectedTime: window.expectedTime
            });
          });
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.log.events.length).to.be(1);
          expect(result.log.events[0].type).to.be('jquery');
          expect(result.log.events[0].domEventType).to.be('KeyboardEvent');
          expect(result.log.events[0].time).
            to.be.above(result.expectedTime - 5);
          expect(result.log.events[0].time).
            to.be.below(result.expectedTime + 5);
          expect(result.log.events[0].details).to.eql(result.expected);
          done();
        });
    });
  });
});
