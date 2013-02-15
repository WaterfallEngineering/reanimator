/* vim: set et ts=2 sts=2 sw=2: */
var expect = require('expect.js');

describe('Reanimator.util.event.create', function () {
  var build = require('../../../util/hooks').build;
  var url = 'http://localhost:' +
    process.env.FIXTURE_PORT +'/index.html';
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

  // XXX: This test may break in future versions of Phantom 1.8
  it('creates Event instances for events whose creation is unsupported',
      function (done) {
        var event = {
          type: 'hashchange',
          bubbles: true,
          cancelable: true,
          oldUrl: 'http://example.com#LOL',
          newUrl: 'http://example.com#WUT'
        };

        driver.get(url).
          then(function () {
            return driver.executeScript(function (event) {
              var ev = Reanimator.util.event.create('HashChangeEvent', event);

              return JSON.stringify({
                isInstance:
                  (ev instanceof Event) && !(ev instanceof HashChangeEvent),
                event: Reanimator.util.event.serialization.serialize(ev)
              });
            }, event);
          }).
          then(function (result) {
            result = JSON.parse(result);
            expect(result.isInstance).to.be(true);
            for (var k in event) {
              expect(result.event[k]).to.eql(event[k]);
            }
            done();
          });
    });
    
  /* 
  // FIXME: not sure how to test this. We want to throw if there is no creator,
  //        as that indicates a corrupt log or one from an incompatible version.
  it('creates Event instances if event not available in the replaying browser',
      function (done) {
        var event = {
          type: 'madeup',
          bubbles: true,
          cancelable: true,
          details: 123
        };

        driver.get(url).
          then(function () {
            return driver.executeScript(function (event) {
              var ev = Reanimator.util.event.create('FakeEvent', event);

              return JSON.stringify({
                isInstance: ev instanceof Event,
                event: Reanimator.util.event.serialization.serialize(ev)
              });
            }, event);
          }).
          then(function (result) {
            result = JSON.parse(result);
            expect(result.isInstance).to.be(true);
            for (var k in event) {
              expect(result.event[k]).to.eql(event[k]);
            }
            done();
          });
    });
   */
    
  [{
    type: 'Event',
    details: {
      type: 'foo',
      bubbles: true,
      cancelable: false
    }
  }, {
    type: 'HashChangeEvent',
    details: {
      type: 'hashchange',
      bubbles: true,
      cancelable: true,
      oldUrl: 'http://example.com#LOL',
      newUrl: 'http://example.com#WUT'
    }
  }, {
    type: 'PopStateEvent',
    details: {
      type: 'popstate',
      bubbles: true,
      cancelable: true,
      state: {
        foo: 'bar'
      }
    }
  }, {
    type: 'UIEvent',
    details: {
      type: 'load',
      bubbles: true,
      cancelable: true,
      view: null,
      detail: 23
    }
  }, {
    type: 'FocusEvent',
    details: {
      type: 'focus',
      bubbles: true,
      cancelable: true,
      view: null,
      detail: {
        foo: 'bar'
      },
      relatedTarget: null
    }
  }, {
    "type":"MouseEvent",
    "details":{
      "type":"click",
      "bubbles":true,
      "cancelable":true,
      "view":"window",
      "detail":1,
      "screenX":0,
      "screenY":0,
      "clientX":163,
      "clientY":30,
      "ctrlKey":false,
      "altKey":false,
      "shiftKey":false,
      "metaKey":false,
      "button":0,
      "relatedTarget":null
    }
  }, {
    "type":"KeyboardEvent",
    "details":{
      // XXX: charCode, keyCode, and keyLocation are zero b/c of webkit bug
      "type":"keydown",
      "bubbles":true,
      "cancelable":true,
      "view":"window",
      "charCode":0,
      "keyCode":0,
      "keyLocation":0,
      "ctrlKey":false,
      "altKey":false,
      "shiftKey":false,
      "metaKey":false
    }
  }].forEach(function (event) {
    it('correctly creates ' + event.type + 's', function (done) {
      driver.get(url).
        then(function () {
          return driver.executeScript(function (event) {
            var supported = false;
            var ev;
            
            if (window[event.type]) {
              try {
                document.createEvent(event.type);
                supported = true;
              } catch (e) { /* not supported */ }
            }

            ev = Reanimator.util.event.create(event.type, event.details);
            return JSON.stringify({
              isInstance:
                ev instanceof (supported ? window[event.type] : Event),
              event: Reanimator.util.event.serialization.serialize(ev)
            });
          }, event);
        }).
        then(function (result) {
          result = JSON.parse(result);
          expect(result.isInstance).to.be(true);
          for (var k in event.details) {
            expect(result.event[k]).to.eql(event.details[k]);
          }
          done();
        });
    });
  });
});


