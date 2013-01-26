/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');
var webdriver = require('../../../lib/selenium-webdriver/node/webdriver');

describe('Reanimator interposes on jQuery event handlers', function () {
  var build = require('../../util/hooks').build;
  var url =
    'http://localhost:' + process.env.FIXTURE_PORT + '/jquery.1.8.3.html';
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

  function dispatchMouseEvent(eventType, target) {
    var event = Reanimator.util.event.create('MouseEvent', {
      type: eventType,
      bubbles: true, cancelable: true,
      global: window, detail: null,
      screenX: 0, screenY: 0, clientX: 0, clientY: 0,
      ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
      button: 0, relatedTarget: null
    });

    event._reanimator.synthetic = true;

    document.querySelector(target).dispatchEvent(event);
  }

  function dispatchKeyEvent(eventType, target) {
    var event = Reanimator.util.event.create('KeyboardEvent', {
      type: eventType,
      bubbles: true, cancelable: true,
      global: window, detail: null,
      ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
      keyCode: 0, charCode: 0
    });

    event._reanimator.synthetic = true;

    document.querySelector(target).dispatchEvent(event);
  }

  function dispatchUIEvent(eventType, target) {
    var event = Reanimator.util.event.create('UIEvent', {
      type: eventType,
      bubbles: true, cancelable: true,
      global: window, detail: null
    });

    event._reanimator.synthetic = true;

    document.querySelector(target).dispatchEvent(event);
  }

  function dispatchEvent(eventType, target) {
    var event = Reanimator.util.event.create('Event', {
      type: eventType,
      bubbles: true, cancelable: true
    });

    event._reanimator.synthetic = true;

    document.querySelector(target).dispatchEvent(event);
  }

  [{
    name: 'click',
    triggerFn: function (result) {
      return driver.findElement(webdriver.By.css('#target')).click();
    },
    dispatchEventFn: dispatchMouseEvent,
    domEventType: 'MouseEvent'
  }, {
    name: 'mousedown',
    triggerFn: function (result) {
      return driver.findElement(webdriver.By.css('#target')).click();
    },
    dispatchEventFn: dispatchMouseEvent,
    domEventType: 'MouseEvent'
  }, {
    name: 'mouseup',
    triggerFn: function (result) {
      return driver.findElement(webdriver.By.css('#target')).click();
    },
    dispatchEventFn: dispatchMouseEvent,
    domEventType: 'MouseEvent'
  }, {
    name: 'keydown',
    triggerFn: function (result) {
      return driver.
        findElement(webdriver.By.css('#target')).sendKeys('x');
    },
    dispatchEventFn: dispatchKeyEvent,
    domEventType: 'KeyboardEvent'
  }, {
    name: 'keyup',
    triggerFn: function (result) {
      return driver.
        findElement(webdriver.By.css('#target')).sendKeys('x');
    },
    dispatchEventFn: dispatchKeyEvent,
    domEventType: 'KeyboardEvent'
  }, {
    name: 'keypress',
    triggerFn: function (result) {
      return driver.
        findElement(webdriver.By.css('#target')).sendKeys('x');
    },
    dispatchEventFn: dispatchKeyEvent,
    domEventType: 'KeyboardEvent'
  }, {
    name: 'change',
    triggerFn: function (result) {
      return driver.findElement(webdriver.By.css('#target')).sendKeys('x').
        then(function () {
          return driver.
            findElement(webdriver.By.css('#trigger-target')).click();
        });
    },
    dispatchEventFn: dispatchEvent,
    domEventType: 'Event'
  }, {
    name: 'focus',
    triggerFn: function (result) {
      return driver.findElement(webdriver.By.css('#target')).click();
    },
    dispatchEventFn: dispatchEvent,
    domEventType: 'Event'
  }, {
    name: 'blur',
    triggerFn: function (result) {
      return driver.findElement(webdriver.By.css('#target')).click().
        then(function () {
          return driver.
            findElement(webdriver.By.css('#trigger-target')).click();
        });
    },
    dispatchEventFn: dispatchEvent,
    domEventType: 'Event'
  }].forEach(function (eventToTest) {
    describe(eventToTest.name, function () {
      it('events are captured', function (done) {
        driver.get(url).
          then(function () {
            return driver.executeScript(function (eventName) {
              // use the native createEvent
              document.createEvent = window._createEvent;

              $('#target').on(eventName, function (e) {
                window.expected = Reanimator.util.event.serialization.
                  serialize(e.originalEvent);
                window.expectedTime = Date.now();
              });
            }, eventToTest.name);
          }).
          then(eventToTest.triggerFn).
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
            var events = result.log.events.filter(function (entry) {
              return entry.type === 'dom';
            });

            expect(events.length).to.be(1);
            expect(events[0].details.type).
              to.be(eventToTest.domEventType);
            expect(events[0].time).
              to.be.above(result.expectedTime - 5);
            expect(events[0].time).
              to.be.below(result.expectedTime + 5);
            expect(events[0].details.details).
              to.eql(result.expected);
            done();
          });
      });

      it('events flagged as synthetic are not captured', function (done) {
        driver.get(url).
          then(function () {
            return driver.executeScript(function (eventName) {
              window.triggered = false;

              // use the native createEvent
              document.createEvent = window._createEvent;
              $('#target').on(eventName, function (e) {
                window.triggered = true;
              });
            }, eventToTest.name);
          }).
          then(function () {
            return driver.executeScript(eventToTest.dispatchEventFn,
              eventToTest.name, '#target');
          }).
          then(function () {
            return driver.executeScript(function () {
              Reanimator.cleanUp();
              return JSON.stringify({
                log: Reanimator.flush(),
                triggered: window.triggered
              });
            });
          }).
          then(function (result) {
            result = JSON.parse(result);
            var events = result.log.events.filter(function (entry) {
              return entry.type === 'dom';
            });

            expect(events.length).to.be(0);

            expect(result.triggered).to.be(true);
            done();
          });
      });

      it('events triggered by $.fn.trigger are not captured', function (done) {
        driver.get(url).
          then(function () {
            return driver.executeScript(function (eventName) {
              window.triggered = false;

              // use the native createEvent
              document.createEvent = window._createEvent;
              $('#trigger-target').on(eventName, function (e) {
                window.triggered = true;
              });
              $('#target').on(eventName, function (e) {
                window.expected = Reanimator.util.event.serialization.
                  serialize(e.originalEvent);
                window.expectedTime = Date.now();
                $('#trigger-target').trigger(eventName);
              });
            }, eventToTest.name);
          }).
          then(eventToTest.triggerFn).
          then(function (result) {
            return driver.executeAsyncScript(function (eventName, callback) {
              setTimeout(function () {
                $('#trigger-target').trigger(eventName);
                callback();
              }, 0);
            }, eventToTest.name);
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
            var events = result.log.events.filter(function (entry) {
              return entry.type === 'dom' ||
                entry.type === 'setTimeout';
            });

            expect(events.length).to.be(2);

            expect(events[0].type).to.be('dom');
            expect(events[0].details.type).
              to.be(eventToTest.domEventType);
            expect(events[0].time).
              to.be.above(result.expectedTime - 5);
            expect(events[0].time).
              to.be.below(result.expectedTime + 5);
            expect(events[0].details.details).
              to.eql(result.expected);

            expect(events[1].type).to.be('setTimeout');

            expect(result.triggered).to.be(true);
            done();
          });
      });

      it('events are not captured after their handler is removed',
        function (done) {
          driver.get(url).
            then(function () {
              return driver.executeScript(function (eventName) {
                function handler(e) {
                  window.expected = Reanimator.util.event.
                    serialization.serialize(e.originalEvent);
                  window.expectedTime = Date.now();
                  $('#target').off(eventName, handler);
                }

                // use the native createEvent
                document.createEvent = window._createEvent;
                $('#target').on(eventName, handler);
              }, eventToTest.name);
            }).
            then(eventToTest.triggerFn).
            then(eventToTest.triggerFn).
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
              var events = result.log.events.filter(function (entry) {
                return entry.type === 'dom';
              });

              expect(events.length).to.be(1);
              expect(events[0].type).to.be('dom');
              expect(events[0].details.type).
                to.be(eventToTest.domEventType);
              expect(events[0].time).
                to.be.above(result.expectedTime - 5);
              expect(events[0].time).
                to.be.below(result.expectedTime + 5);
              expect(events[0].details.details).
                to.eql(result.expected);
              done();
            });
      });

        it('events are captured once per occurrence', function (done) {
          driver.get(url).
            then(function () {
              return driver.executeScript(function (eventName) {
                function handler1(e) {
                  window.expected1 = Reanimator.util.event.
                    serialization.serialize(e.originalEvent);
                  window.expectedTime1 = Date.now();
                  $('#target').off(eventName, handler1);
                }

                function handler2(e) {
                  window.expected2 = Reanimator.util.event.
                    serialization.serialize(e.originalEvent);
                  window.expectedTime2 = Date.now();
                  $('#target').off(eventName, handler2);
                }

                // use the native createEvent
                document.createEvent = window._createEvent;
                $('#target').on(eventName, handler1);
                $('#target').on(eventName, handler2);
              }, eventToTest.name);
            }).
            then(eventToTest.triggerFn).
            then(function () {
              return driver.executeScript(function () {
                Reanimator.cleanUp();
                return JSON.stringify({
                  log: Reanimator.flush(),
                  expected1: window.expected1,
                  expectedTime1: window.expectedTime1,
                  expected2: window.expected2,
                  expectedTime2: window.expectedTime2
                });
              });
            }).
            then(function (result) {
              result = JSON.parse(result);
              var events = result.log.events.filter(function (entry) {
                return entry.type === 'dom';
              });

              expect(events.length).to.be(1);
              expect(events[0].type).to.be('dom');
              expect(events[0].details.type).
                to.be(eventToTest.domEventType);

              expect(events[0].time).
                to.be.above(result.expectedTime1 - 5);
              expect(events[0].time).
                to.be.below(result.expectedTime1 + 5);
              expect(events[0].details.details).
                to.eql(result.expected1);

              expect(events[0].time).
                to.be.above(result.expectedTime2 - 5);
              expect(events[0].time).
                to.be.below(result.expectedTime2 + 5);
              expect(events[0].details.details).
                to.eql(result.expected2);

              done();
            });
        });
    });
  });
});
