/* vim: set et ts=2 sts=2 sw=2: */
var expect = require('expect.js');

describe('Reanimator captures listeners on window', function () {
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

  it('defined via window.addEventListener', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function (callback) {
          var createEvent = document.createEvent;

          Reanimator.capture();

          window.addEventListener('foo', function (e) {
            window.expected = Reanimator.util.event.serialization.serialize(e);
            window.expectedTime = Date.now();
          }, false);

          var ev = createEvent.call(document, 'Event');
          ev.initEvent('foo', true, true);
          window.dispatchEvent(ev);

          return JSON.stringify({
            expected: window.expected,
            expectedTime: window.expectedTime,
            log: Reanimator.flush()
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        var events = result.log.events.filter(function (entry) {
          return entry.type === 'dom';
        });

        expect(events.length).to.be(1);
        expect(events[0].time).to.be.above(result.expectedTime - 5);
        expect(events[0].time).to.be.below(result.expectedTime + 5);
        expect(events[0].details.details).to.eql(result.expected);
        done();
      });
  });

  it('defined via window.onfoo', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeAsyncScript(function (callback) {
          Reanimator.capture();

          window.onhashchange = function (e) {
            window.expected = Reanimator.util.event.serialization.serialize(e);
            window.expectedTime = Date.now();

            callback(JSON.stringify({
              expected: window.expected,
              expectedTime: window.expectedTime,
              log: Reanimator.flush()
            }));
          };

          location.hash = '#fire';
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        var events = result.log.events.filter(function (entry) {
          return entry.type === 'dom' &&
            entry.details.type === 'HashChangeEvent';
        });

        expect(events.length).to.be(1);
        expect(events[0].time).to.be.above(result.expectedTime - 5);
        expect(events[0].time).to.be.below(result.expectedTime + 5);
        expect(events[0].details.details).to.eql(result.expected);
        done();
      });
  });

  it('unless synthetic', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function (callback) {
          Reanimator.capture();

          window.addEventListener('foo', function (e) {
            window.listenerFired = true;
          }, false);

          var ev = document.createEvent('Event');
          ev.initEvent('foo', true, true);
          window.dispatchEvent(ev);

          return JSON.stringify({
            fired: window.listenerFired,
            log: Reanimator.flush()
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        var events = result.log.events.filter(function (entry) {
          return entry.type === 'dom';
        });

        expect(events.length).to.be(0);
        expect(result.fired).to.be(true);
        done();
      });
  });

  it('unless already captured', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function (callback) {
          Reanimator.capture();

          window.addEventListener('foo', function (e) {
            window.listenerFired = true;
          }, false);

          var ev = document.createEvent('Event');
          ev.initEvent('foo', true, true);
          ev._reanimator.captured = true;
          delete ev._reanimator.synthetic;
          window.dispatchEvent(ev);

          return JSON.stringify({
            fired: window.listenerFired,
            log: Reanimator.flush()
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        var events = result.log.events.filter(function (entry) {
          return entry.type === 'dom';
        });

        expect(events.length).to.be(0);
        expect(result.fired).to.be(true);
        done();
      });
  });

  it('unless event.target !== window', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function (callback) {
          var createEvent = document.createEvent;

          Reanimator.capture();

          window.addEventListener('foo', function (e) {
            window.listenerFired = true;
          }, false);

          var ev = createEvent.call(document, 'Event');
          ev.initEvent('foo', true, true);
          document.dispatchEvent(ev);

          return JSON.stringify({
            fired: window.listenerFired,
            log: Reanimator.flush()
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        var events = result.log.events.filter(function (entry) {
          return entry.type === 'dom';
        });

        expect(events.length).to.be(0);
        expect(result.fired).to.be(true);
        done();
      });
  });
});

