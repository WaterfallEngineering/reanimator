/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');
var webdriver = require('../../../lib/selenium-webdriver/node/webdriver');

describe('Reanimator replays jQuery event handlers', function () {
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

  it('click', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#target').on('click', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function (result) {
        // FIXME: webdriver gets four dates. modify it to use the native date
        return driver.findElement(webdriver.By.css('#target')).click();
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#target').one('click', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);
        //console.dir(result);

        expectedKeys.forEach(function (k) {
          expect(result.replayed[k]).to.eql(result.captured[k]);
        });

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('mousedown', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#target').on('mousedown', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function (result) {
        // FIXME: webdriver gets four dates. modify it to use the native date
        return driver.findElement(webdriver.By.css('#target')).click();
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#target').one('mousedown', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);
        //console.dir(result);

        expectedKeys.forEach(function (k) {
          expect(result.replayed[k]).to.eql(result.captured[k]);
        });

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('mouseup', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#target').on('mouseup', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function (result) {
        // FIXME: webdriver gets four dates. modify it to use the native date
        return driver.findElement(webdriver.By.css('#target')).click();
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#target').one('mouseup', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);
        //console.dir(result);

        expectedKeys.forEach(function (k) {
          expect(result.replayed[k]).to.eql(result.captured[k]);
        });

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('keydown', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#key-target').on('keydown', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#key-target')).sendKeys('x');
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#key-target').one('keydown', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('keyup', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#key-target').on('keyup', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#key-target')).sendKeys('x');
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#key-target').one('keyup', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('keypress', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#key-target').on('keypress', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#key-target')).sendKeys('x');
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#key-target').one('keypress', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('change', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#key-target').on('change', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#key-target')).sendKeys('foobar');
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#target')).click();
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#key-target').one('change', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('focus', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#key-target').on('focus', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#key-target')).sendKeys('foobar');
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#key-target').one('focus', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });

  it('blur', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();

          $('#key-target').on('blur', function (e) {
            window.logAtReplay = Reanimator.flush();
            window.webdriverDateCount = Reanimator.flush().dates.length;
            window.captured =
              Reanimator.util.event.serialization.serialize(e.originalEvent);
            window.capturedTimeStamp = e.timeStamp;
            window.capturedTime = Date.now();
          });

        });
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#key-target')).sendKeys('foobar');
      }).
      then(function () {
        return driver.
          findElement(webdriver.By.css('#target')).click();
      }).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          var captured = window.captured;
          var capturedTime = window.capturedTime;
          var capturedDates = window.capturedDates;

          Reanimator.cleanUp();

          $('#key-target').one('blur', function (e) {
            callback(JSON.stringify({
              captured: captured,
              capturedTime: capturedTime,
              replayed: window.captured,
              replayedTime: window.capturedTime,
              replayedTimeStamp: window.capturedTimeStamp
            }));
          });

          var log = Reanimator.flush();
          // slice off the date calls from webdriver
          dateCount = window.webdriverDateCount;
          log.dates =
            log.dates.slice(-(log.dates.length - window.webdriverDateCount));

          Reanimator.replay(log);
        });
      }).
      then(function (result) {
        var expectedKeys = [
          'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
          'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget',
          'button', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY',
          'clientX', 'screenY', 'screenX', 'which', 'pageY', 'pageX',
          'layerY', 'layerX', 'charCode', 'keyCode', 'detail', 'view',
          'clipboardData', 'cancelBubble', 'returnValue', 'srcElement',
          'defaultPrevented', 'cancelable', 'bubbles', 'eventPhase',
          'currentTarget', 'target', 'type'
        ];
        result = JSON.parse(result);

        // cannot set timeStamp on original event, but can on normalized event
        expect(result.replayedTimeStamp).to.be(result.captured.timeStamp);

        expect(result.replayedTime).to.be(result.capturedTime);

        done();
      });
  });
});
