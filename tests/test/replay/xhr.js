/* vim: set et ts=2 sts=2 sw=2: */
var expect = require('expect.js');
var asyncTrialRunner = require('../../util/async-trial-runner');

describe('Reanimator replays XMLHttpRequest', function () {
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

  it('replayed XHR instances have the logged interface', function (done) {
    var log = {
      xhr: {
        iface:{
          "instance":{
              "methods":[],
              "properties":[
                "readyState","response","responseXML","onload","onerror",
                "onloadstart","status","onabort","onreadystatechange",
                "responseType","responseText","statusText"
              ]
          },
          "prototype":{
            "methods":[
              "getResponseHeader","setRequestHeader","open",
              "getAllResponseHeaders","dispatchEvent","send","abort",
              "addEventListener","removeEventListener"
            ],
            "properties":["DONE","UNSENT","HEADERS_RECEIVED","LOADING","OPENED"]
          }
        },
        instances: [{ id: 0 }]
      },
      events: [],
      random: [],
      date: []
    };
    
    driver.get(url).
      then(function () {
        return driver.executeScript(function (log) {
          Reanimator.replay(log);
          var actual = {
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

          actual.instance.properties = Object.keys(xhr).filter(function (k) {
            var descriptor = Object.getOwnPropertyDescriptor(xhr, k);
            if (descriptor.value && typeof descriptor.value === 'function') {
              actual.instance.methods.push(k);
              return false;
            }

            // ignore _reanimator
            return k !== '_reanimator';
          });

          // FIXME: this only checks that the expected keys are present. it does
          //        NOT check that unexpected keys are NOT present.
          actual.prototype.properties = log.xhr.iface.prototype.properties
            .filter(function (k) {
              return !xhr.hasOwnProperty(k) && xhr[k] !== void undefined;
            });

          actual.prototype.methods = log.xhr.iface.prototype.methods
            .filter(function (k) {
              return !xhr.hasOwnProperty(k) && xhr[k] !== void undefined;
            });

          Reanimator.cleanUp();

          return JSON.stringify({
            actual: actual,
            expected: log.xhr.iface
          });
        }, log);
      }).
      then(function (result) {
        result = JSON.parse(result);

        ['actual', 'expected'].forEach(function (which) {
          ['instance', 'prototype'].forEach(function (objectType) {
            ['methods', 'properties'].forEach(function (keyType) {
              result[which][objectType][keyType].sort();
            });
          });
        });
        expect(result.actual.instance).to.eql(result.expected.instance);
        expect(result.actual.prototype).to.eql(result.expected.prototype);
        done();
      });
  });

  it('replays property access results and exceptions', function (done) {
    var log = {
      xhr: {
        iface:{
          "instance":{
              "methods":[],
              "properties":[
                "readyState","response","responseXML","onload","onerror",
                "onloadstart","status","onabort","onreadystatechange",
                "responseType","responseText","statusText"
              ]
          },
          "prototype":{
            "methods":[
              "getResponseHeader","setRequestHeader","open",
              "getAllResponseHeaders","dispatchEvent","send","abort",
              "addEventListener","removeEventListener"
            ],
            "properties":["DONE","UNSENT","HEADERS_RECEIVED","LOADING","OPENED"]
          }
        },
        instances: [{
          open: [
            { type: 'result', value: null }
          ],
          readyState: [
            { type: 'result', value: 0 },
            { type: 'result', value: 0 }
          ],
          status: [
            { type: 'result', value: 0 },
            {
              type: 'error',
              value: {
                message: 'INVALID_STATE_ERROR: DOM Exception 11',
                code: 11,
                name: 'INVALID_STATE_ERROR'
              }
            }
          ]
        }]
      },
      events: [],
      random: [],
      date: []
    };

    driver.get(url).
      then(function () {
        return driver.executeScript(function (log) {
          var expected = {
            readyState: log.xhr.instances[0].readyState.slice(),
            status: log.xhr.instances[0].status.slice()
          };
          var actual = {
            readyState: [],
            status: []
          };

          function access(name) {
            try {
              actual[name].push({
                type: 'result',
                value: xhr[name]
              });
            } catch (e) {
              actual[name].push({
                type: 'error',
                value: {
                  message: e.message,
                  code: e.code,
                  name: e.name
                }
              });
            }
          }

          Reanimator.replay(log);
          var xhr = new XMLHttpRequest();

          // both should succeed
          access('readyState');
          access('status');

          xhr.open('GET', 'xhr.json', true);

          // status should throw
          access('readyState');
          access('status');

          return JSON.stringify({
            expected: expected,
            actual: actual
          });
        }, log);
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual.readyState).to.eql(result.expected.readyState);
        expect(result.actual.status).to.eql(result.expected.status);
        done();
      });
  });

  it('replays method call results and exceptions', function (done) {
    var log = {
      xhr: {
        iface:{
          "instance":{
              "methods":[],
              "properties":[
                "readyState","response","responseXML","onload","onerror",
                "onloadstart","status","onabort","onreadystatechange",
                "responseType","responseText","statusText"
              ]
          },
          "prototype":{
            "methods":[
              "getResponseHeader","setRequestHeader","open",
              "getAllResponseHeaders","dispatchEvent","send","abort",
              "addEventListener","removeEventListener"
            ],
            "properties":["DONE","UNSENT","HEADERS_RECEIVED","LOADING","OPENED"]
          }
        },
        instances: [{
          open: [
            { type: 'result', value: undefined }
          ],
          send: [
            {
              type: 'error',
              value: {
                message: 'INVALID_STATE_ERROR: DOM Exception 11',
                code: 11,
                name: 'INVALID_STATE_ERROR'
              }
            },
            { type: 'result', value: undefined }
          ]
        }]
      },
      events: [],
      random: [],
      date: []
    };

    driver.get(url).
      then(function () {
        return driver.executeScript(function (log) {
          var expected = {
            open: log.xhr.instances[0].open.slice(),
            send: log.xhr.instances[0].send.slice()
          };
          var actual = {};

          function call(name) {
            var args = Array.prototype.slice.call(arguments, 1);
            actual[name] = actual[name] || [];
            try {
              actual[name].push({
                type: 'result',
                value: xhr[name].apply(xhr, args)
              });
            } catch (e) {
              actual[name].push({
                type: 'error',
                value: {
                  message: e.message,
                  code: e.code,
                  name: e.name
                }
              });
            }
          }

          Reanimator.replay(log);
          var xhr = new XMLHttpRequest();

          // send should throw
          call('send');
          call('open', 'GET', 'xhr.json', true);

          // send should *not* throw
          call('send');

          return JSON.stringify({
            expected: expected,
            actual: actual
          });
        }, log);
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual.open).to.eql(result.expected.open);
        expect(result.actual.send).to.eql(result.expected.send);
        done();
      });
  });
  
  describe('readystatechange events', function () {
    var log = {
      "events":[
        {"type":"xhr",
          "time":1360560201454,
          "details":
            {"id":0,
              "type":"Event",
              "details":
                {"totalSize":0, "position":0, "total":0, "loaded":0,
                  "lengthComputable":false, "cancelBubble":false,
                  "returnValue":true, "srcElement":0, "defaultPrevented":false,
                  "timeStamp":1360560201454, "cancelable":true, "bubbles":false,
                  "eventPhase":2, "currentTarget":0, "target":0,
                  "type":"readystatechange", "_reanimator": {"captured":true},
                  "NONE":0, "CAPTURING_PHASE":1, "AT_TARGET":2,
                  "BUBBLING_PHASE":3, "MOUSEDOWN":1, "MOUSEUP":2, "MOUSEOVER":4,
                  "MOUSEOUT":8, "MOUSEMOVE":16, "MOUSEDRAG":32, "CLICK":64,
                  "DBLCLICK":128, "KEYDOWN":256, "KEYUP":512, "KEYPRESS":1024,
                  "DRAGDROP":2048, "FOCUS":4096, "BLUR":8192, "SELECT":16384,
                  "CHANGE":32768
              }
            }
        },
        {"type":"xhr",
          "time":1360560204455,
          "details":
            {"id":0,
              "type":"Event",
              "details":
                {"totalSize":0, "position":0, "total":0, "loaded":0,
                  "lengthComputable":false, "cancelBubble":false,
                  "returnValue":true, "srcElement":0, "defaultPrevented":false,
                  "timeStamp":1360560204455, "cancelable":true, "bubbles":false,
                  "eventPhase":2, "currentTarget":0, "target":0,
                  "type":"readystatechange", "_reanimator": {"captured":true},
                  "NONE":0, "CAPTURING_PHASE":1, "AT_TARGET":2,
                  "BUBBLING_PHASE":3, "MOUSEDOWN":1, "MOUSEUP":2, "MOUSEOVER":4,
                  "MOUSEOUT":8, "MOUSEMOVE":16, "MOUSEDRAG":32, "CLICK":64,
                  "DBLCLICK":128, "KEYDOWN":256, "KEYUP":512, "KEYPRESS":1024,
                  "DRAGDROP":2048, "FOCUS":4096, "BLUR":8192, "SELECT":16384,
                  "CHANGE":32768
                }
            }
        },
        {"type":"xhr",
          "time":1360560204456,
          "details":
            {"id":0,
              "type":"Event",
              "details":
                {"totalSize":0, "position":0, "total":0, "loaded":0,
                  "lengthComputable":false, "cancelBubble":false,
                  "returnValue":true, "srcElement":0, "defaultPrevented":false,
                  "timeStamp":1360560204456, "cancelable":true, "bubbles":false,
                  "eventPhase":2, "currentTarget":0, "target":0,
                  "type":"readystatechange", "_reanimator": {"captured":true},
                  "NONE":0, "CAPTURING_PHASE":1, "AT_TARGET":2,
                  "BUBBLING_PHASE":3, "MOUSEDOWN":1, "MOUSEUP":2, "MOUSEOVER":4,
                  "MOUSEOUT":8, "MOUSEMOVE":16, "MOUSEDRAG":32, "CLICK":64,
                  "DBLCLICK":128, "KEYDOWN":256, "KEYUP":512, "KEYPRESS":1024,
                  "DRAGDROP":2048, "FOCUS":4096, "BLUR":8192, "SELECT":16384,
                  "CHANGE":32768
                }
            }
        },
        {"type":"xhr",
          "time":1360560204456,
          "details":
            {"id":0,
              "type":"Event",
              "details":
                {"totalSize":0, "position":0, "total":0, "loaded":0,
                  "lengthComputable":false, "cancelBubble":false,
                  "returnValue":true, "srcElement":0, "defaultPrevented":false,
                  "timeStamp":1360560204456, "cancelable":true, "bubbles":false,
                  "eventPhase":2, "currentTarget":0, "target":0,
                  "type":"readystatechange", "_reanimator": {"captured":true},
                  "NONE":0, "CAPTURING_PHASE":1, "AT_TARGET":2,
                  "BUBBLING_PHASE":3, "MOUSEDOWN":1, "MOUSEUP":2, "MOUSEOVER":4,
                  "MOUSEOUT":8, "MOUSEMOVE":16, "MOUSEDRAG":32, "CLICK":64,
                  "DBLCLICK":128, "KEYDOWN":256, "KEYUP":512, "KEYPRESS":1024,
                  "DRAGDROP":2048, "FOCUS":4096, "BLUR":8192, "SELECT":16384,
                  "CHANGE":32768
                }
            }
        }
      ],
      "dates":[],
      "random":[],
      "xhr": {
        "iface": {
          "instance": {
            "methods":[],
            "properties":[
              "statusText","status","response","responseType","responseXML",
              "responseText","upload","withCredentials","readyState",
              "onreadystatechange","onprogress","onloadstart","onloadend",
              "onload","onerror","onabort"
            ]
          },
          "prototype": {
            "methods":[
              "open","setRequestHeader","send","abort","getAllResponseHeaders",
              "getResponseHeader","overrideMimeType","addEventListener",
              "removeEventListener","dispatchEvent"
            ],
            "properties":["UNSENT","OPENED","HEADERS_RECEIVED","LOADING","DONE"]
          }
        },
        "instances":[{
          "id":0,
          "open":[{"type":"result"}],
          "readyState":[
            {"type":"result", "value":1},
            {"type":"result", "value":2},
            {"type":"result", "value":3},
            {"type":"result", "value":4}],
          "send":[{"type":"result"}]
        }]
      }
    };

    it('are replayed to onreadystatechange', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (log, callback) {
            var events = [];

            Reanimator.replay(log);
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (e) {
              var isInstance = e.target instanceof XMLHttpRequest;

              var event = {};
              for (var k in e.entry.details.details) {
                event[k] = e[k];
              }
              event.target = event.currentTarget = event.srcElement =
                e.target._reanimator.id;

              events.push(event);

              if (xhr.readyState === XMLHttpRequest.DONE) {
                Reanimator.cleanUp();
                callback(JSON.stringify({
                  isInstance: isInstance,
                  replayed: events
                }));
              }
            };

            xhr.open('GET', 'xhr.json', true);
            xhr.send();
          }, log);
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.isInstance).to.be(true);
          expect(result.replayed.length).to.be(log.events.length);

          var event;
          for (var i = 0; i < result.replayed.length; i++) {
            event = result.replayed[i];
            for (var k in event.details) {
              if (k[0] !== '_') {
                expect(event.details[k]).
                  to.eql(log.events[i].details.details[k]);
              }
            }
          }
          done();
        });
    });

    it('are replayed to listeners hooked by addEventListener', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (log, callback) {
            var events = [];
            var calls = [];

            Reanimator.replay(log);
            var xhr = new XMLHttpRequest();

            xhr.addEventListener('readystatechange', function (e) {
              calls.push('one');
            });

            xhr.addEventListener('readystatechange', function (e) {
              var isInstance = e.target instanceof XMLHttpRequest;
              calls.push('two');

              var event = {};
              for (var k in e.entry.details.details) {
                event[k] = e[k];
              }
              event.target = event.currentTarget = event.srcElement =
                e.target._reanimator.id;

              events.push(event);

              if (xhr.readyState === XMLHttpRequest.DONE) {
                Reanimator.cleanUp();
                callback(JSON.stringify({
                  calls: calls,
                  isInstance: isInstance,
                  replayed: events
                }));
              }
            });

            xhr.open('GET', 'xhr.json', true);
            xhr.send();
          }, log);
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result.calls).
            to.eql(['one', 'two', 'one', 'two', 'one', 'two', 'one', 'two']);
          expect(result.isInstance).to.be(true);
          expect(result.replayed.length).to.be(log.events.length);

          var event;
          for (var i = 0; i < result.replayed.length; i++) {
            event = result.replayed[i];
            for (var k in event.details) {
              if (k[0] !== '_') {
                expect(event.details[k]).
                  to.eql(log.events[i].details.details[k]);
              }
            }
          }
          done();
        });
    });

    it('are replayed to listeners hooked by both means', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeAsyncScript(function (log, callback) {
            var calls = [];

            Reanimator.replay(log);
            var xhr = new XMLHttpRequest();

            xhr.addEventListener('readystatechange', function (e) {
              calls.push('one');
            });

            xhr.onreadystatechange = function (e) {
              calls.push('two');
            };

            xhr.addEventListener('readystatechange', function (e) {
              calls.push('three');
              Reanimator.cleanUp();
              callback(JSON.stringify(calls));
            });

            xhr.open('GET', 'xhr.json', true);
          }, log);
        }).
        then(function (result) {
          result = JSON.parse(result);

          expect(result).to.eql(['one', 'two', 'three']);
          done();
        });
    });
  });
/*
  it('as expected', function (done) {
    driver.get(url).
      then(function () {
        return driver.executeAsyncScript(function (type, log, callback) {
          var replayed = [];
          var replayedState = [];

          Reanimator.replay(log);

          var xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function (e) {
            var isInstance = e.target instanceof XMLHttpRequest;

            var snapshot = {
              readyState: xhr.readyState,
              responseText: xhr.responseText,
              responseXML: xhr.responseXML,
              responseType: xhr.responseType
            };

            if (xhr.readyState >= XMLHttpRequest.HEADERS_RECEIVED) {
              snapshot.status = xhr.status;
              snapshot.statusText = xhr.statusText;
            }

            replayedState.push(snapshot);

            var event = Reanimator.util.event.serialization.serialize(e);
            event.target = e.target._reanimator.id;
            event.currentTarget = e.currentTarget._reanimator.id;
            event.srcElement = e.srcElement._reanimator.id;

            replayed.push(event);

            if (xhr.readyState === XMLHttpRequest.DONE) {
              Reanimator.cleanUp();
              callback(JSON.stringify({
                replayed: replayed,
                replayedState: replayedState,
                isInstance: isInstance
              }));
            }
          };
        }, log);
      }).
      then(function (result) {
        result = JSON.parse(result);

        expect(result.isInstance).to.be(true);
        expect(result.replayed.length).to.be(log.length);

        for (var i = 0; i < replayed.length; i++) {
          expect(replayedState[i]).to.eql(log[i].details.state);

          for (var k in log[i].details.details) {
            if (k[0] !== '_') {
              expect(replayed[i][k]).to.eql(log[i].details.details[k]);
            }
          }
        }
        done();
    });
  });
  */
});
