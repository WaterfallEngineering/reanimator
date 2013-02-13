/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');

describe('Reanimator replays localStorage', function () {
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

  it('restores the pre-replay localStorage state on cleanUp', function (done) {
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
        instances: []
      },
      events: [],
      random: [],
      date: [],
      localStorage: {
        state: {
          foo: 123,
          bar: 'applesauce'
        }
      }
    };

    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var data = {
            foo: 123,
            fiz: 'biz'
          };
          var xhr = new XMLHttpRequest();
          var actual = {};

          for (var k in data) {
            localStorage[k] = data[k];
          }

          Reanimator.replay(log);
          Reanimator.cleanUp();

          for (var i = 0, len = localStorage.length; i < len; i++) {
            k = localStorage.key(i);
            actual[k] = localStorage[k];
          }

          return JSON.stringify({
            actual: actual,
            expected: data
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual).to.eql(result.expected);
        done();
      });
  });

  it('replays the captured initial localStorage state', function (done) {
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
        instances: []
      },
      events: [],
      random: [],
      date: [],
      localStorage: {
        state: {
          foo: 123,
          bar: 'applesauce'
        }
      }
    };

    driver.get(url).
      then(function () {
        return driver.executeScript(function () {
          var xhr = new XMLHttpRequest();
          var actual = {};

          Reanimator.replay(log);

          for (var i = 0, len = localStorage.length; i < len; i++) {
            k = localStorage.key(i);
            actual[k] = localStorage[k];
          }

          Reanimator.cleanUp();

          return JSON.stringify({
            actual: actual,
            expected: log.localStorage.state
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);
        expect(result.actual).to.eql(result.expected);
        done();
      });
  });
});
