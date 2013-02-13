/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');

describe('Reanimator interposes on XMLHttpRequest', function () {
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

  it('captures the interface of an XHR and its prototype', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var expected = {
            instance: {
              methods: [],
              properties: []
            },
            prototype: {
              methods: [],
              properties: []
            }
          };
          var xhr = new XMLHttpRequest();
          var k;

          expected.instance.properties = Object.keys(xhr).filter(function (k) {
            if (typeof xhr[k] === 'function') {
              expected.instance.methods.push(k);
              return false;
            }

            return true;
          });

          expected.prototype.properties =
            Object.keys(xhr.constructor.prototype).filter(function (k) {
              if (typeof xhr.constructor.prototype[k] === 'function') {
                expected.prototype.methods.push(k);
                return false;
              }

              return true;
            });

          Reanimator.capture();

          return JSON.stringify({
            actual: Reanimator.flush().xhr.iface,
            expected: expected
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual.instance).to.eql(result.expected.instance);
        expect(result.actual.prototype).to.eql(result.expected.prototype);
        done();
      });
  });

  it('logs xhr instances', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          Reanimator.capture();
          var xhr;
          var expected = [];
          
          xhr = new XMLHttpRequest();
          expected.push(xhr._reanimator.id);

          xhr = new XMLHttpRequest();
          expected.push(xhr._reanimator.id);

          return JSON.stringify({
            actual: Reanimator.flush().xhr.instances,
            expected: expected
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);

        result.expected.forEach(function (id) {
          expect(result.actual[id]).to.be.an('object');
        });
        done();
      });
  });

  // TODO: Figure out how to test that we don't add methods to the virtual XHR
  //       prototype that aren't on the native one

  it('captures property access results and exceptions', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var expected = {
            readyState: [],
            status: []
          };

          function access(name) {
            try {
              expected[name].push({
                type: 'result',
                value: xhr[name]
              });
            } catch (e) {
              expected[name].push({
                type: 'error',
                value: {
                  message: e.message,
                  code: e.code,
                  name: e.name
                }
              });
            }
          }

          Reanimator.capture();
          var xhr = new XMLHttpRequest();

          // both should succeed
          access('readyState');
          access('status');

          xhr.open('GET', 'xhr.json', true);

          // status should throw
          access('readyState');
          access('status');

          return JSON.stringify({
            actual: Reanimator.flush().xhr.instances[0],
            expected: expected
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual.readyState).to.eql(result.expected.readyState);
        expect(result.actual.status).to.eql(result.expected.status);
        done();
      });
  });

  it('captures method call results and exceptions', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var expected = {};

          function call(name) {
            var args = Array.prototype.slice.call(arguments, 1);
            expected[name] = expected[name] || [];
            try {
              expected[name].push({
                type: 'result',
                value: xhr[name].apply(xhr, args)
              });
            } catch (e) {
              expected[name].push({
                type: 'error',
                value: {
                  message: e.message,
                  code: e.code,
                  name: e.name
                }
              });
            }
          }

          Reanimator.capture();
          var xhr = new XMLHttpRequest();

          // send should throw
          call('send');
          call('open', 'GET', 'xhr.json', true);

          // send should *not* throw
          call('send');

          return JSON.stringify({
            actual: Reanimator.flush().xhr.instances[0],
            expected: expected
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual.send).to.eql(result.expected.send);
        expect(result.actual.open).to.eql(result.expected.open);
        done();
      });
  });
    
  describe('captures and refires readystatechange events', function () {
    it('listened for by setting onreadystatechange', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (url, callback) {
            var events = [];
            var listenerFired = false;

            Reanimator.capture();
            
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (e) {
              listenerFired = true;
            };
            xhr.onreadystatechange = function (e) {
              var isInstance = e.target instanceof XMLHttpRequest;

              var event = Reanimator.util.event.serialization.serialize(e);
              event.target = xhr._reanimator.id;
              event.currentTarget = xhr._reanimator.id;
              event.srcElement = xhr._reanimator.id;

              events.push(event);

              if (xhr.readyState === XMLHttpRequest.DONE) {
                Reanimator.cleanUp();
                callback(JSON.stringify({
                  listenerFired: listenerFired,
                  isInstance: isInstance,
                  expected: {
                    events: events
                  },
                  log: Reanimator.flush()
                }));
              }
            };

            xhr.open('GET', url, true);
            xhr.send();

          }, 'http://localhost:' + process.env.FIXTURE_PORT + '/xhr.json');
        }).
        then(function (result) {
          result = JSON.parse(result);

          var log = result.log.events.filter(function (entry) {
            return entry.type === 'xhr';
          });

          expect(result.listenerFired).to.be(false);
          expect(result.isInstance).to.be(true);
          expect(log.length).to.be(result.expected.events.length);

          for (var i = 0; i < log.length; i++) {
            expect(log[i].details.id).to.be(0);
            expect(log[i].details.type).to.be('Event');

            delete result.expected.events[i].target;
            delete result.expected.events[i].srcElement;
            delete result.expected.events[i].currentTarget;
            for (var k in result.expected.events[i]) {
              if (k[0] !== '_') {
                expect(log[i].details.details[k]).
                  to.eql(result.expected.events[i][k]);
              }
            }
          }
          done();
        });
    });

    it('listened for by calling addEventListener', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (url, callback) {
            var events = [];

            Reanimator.capture();
            
            var xhr = new XMLHttpRequest();
            xhr.addEventListener('readystatechange', function (e) {
              var isInstance = e.target instanceof XMLHttpRequest;

              events.push(Reanimator.util.event.serialization.serialize(e));

              if (xhr.readyState === XMLHttpRequest.DONE) {
                Reanimator.cleanUp();
                callback(JSON.stringify({
                  isInstance: isInstance,
                  expected: {
                    events: events
                  },
                  log: Reanimator.flush()
                }));
              }
            });

            xhr.open('GET', url, true);
            xhr.send();
          }, 'http://localhost:' + process.env.FIXTURE_PORT + '/xhr.json');
        }).
        then(function (result) {
          result = JSON.parse(result);

          var log = result.log.events.filter(function (entry) {
            return entry.type === 'xhr';
          });

          expect(result.isInstance).to.be(true);
          expect(log.length).to.be(result.expected.events.length);

          for (var i = 0; i < log.length; i++) {
            expect(log[i].details.id).to.be(0);
            expect(log[i].details.type).to.be('Event');

            delete result.expected.events[i].target;
            delete result.expected.events[i].srcElement;
            delete result.expected.events[i].currentTarget;
            for (var k in result.expected.events[i]) {
              if (k[0] !== '_') {
                expect(log[i].details.details[k]).
                  to.eql(result.expected.events[i][k]);
              }
            }
          }
          done();
        });
    });

    it('only if someone is listening', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (url, callback) {
            var numFired = 0;

            function handler(e) {
              numFired++;
            }

            Reanimator.capture();
            
            var xhr = new XMLHttpRequest();

            xhr.onreadystatechange = handler;
            xhr.onreadystatechange = null;
            xhr.addEventListener('readystatechange', handler, false);
            xhr.removeEventListener('readystatechange', handler, false);

            xhr._value.addEventListener('readystatechange', function (e) {
              Reanimator.cleanUp();
              callback(JSON.stringify({
                numFired: numFired,
                log: Reanimator.flush()
              }));
            });

            xhr.open('GET', url, true);
            xhr.send();
          }, 'http://localhost:' + process.env.FIXTURE_PORT + '/xhr.json');
        }).
        then(function (result) {
          result = JSON.parse(result);

          var log = result.log.events.filter(function (entry) {
            return entry.type === 'xhr';
          });

          expect(log.length).to.be(0);
          expect(result.numFired).to.be(0);

          done();
        });
    });

    it('exactly once per event', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (url, callback) {
            var events = [];
            var numFired = 0;

            Reanimator.capture();
            
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (e) {
              if (xhr.readyState === XMLHttpRequest.DONE) {
                numFired++;
              }
            };
            xhr.addEventListener('readystatechange', function (e) {
              if (xhr.readyState === XMLHttpRequest.DONE) {
                numFired++;
              }
            });
            xhr.addEventListener('readystatechange', function (e) {
              events.push(Reanimator.util.event.serialization.serialize(e));

              if (xhr.readyState === XMLHttpRequest.DONE) {
                Reanimator.cleanUp();
                numFired++;
                callback(JSON.stringify({
                  numFired: numFired,
                  expected: {
                    events: events
                  },
                  log: Reanimator.flush()
                }));
              }
            });

            xhr.open('GET', url, true);
            xhr.send();
          }, 'http://localhost:' + process.env.FIXTURE_PORT + '/xhr.json');
        }).
        then(function (result) {
          result = JSON.parse(result);

          var log = result.log.events.filter(function (entry) {
            return entry.type === 'xhr';
          });

          expect(log.length).to.be(result.expected.events.length);

          for (var i = 0; i < log.length; i++) {
            expect(log[i].details.id).to.be(0);
            expect(log[i].details.type).to.be('Event');

            delete result.expected.events[i].target;
            delete result.expected.events[i].srcElement;
            delete result.expected.events[i].currentTarget;
            for (var k in result.expected.events[i]) {
              if (k[0] !== '_') {
                expect(log[i].details.details[k]).
                  to.eql(result.expected.events[i][k]);
              }
            }
          }
          done();
        });
    });
  });
});
