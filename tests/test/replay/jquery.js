/* vim: set et ts=2 sts=2 sw=2: */

var expect = require('expect.js');
var webdriver = require('../../../lib/selenium-webdriver/node/webdriver');
var _ = require('lodash');

describe('jQuery replay', function () {
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

  var expectedKeys = [
      // ignored b/c of https://bugs.webkit.org/show_bug.cgi?id=16735
      // 'charCode', 'keyCode', 'which',
      'webkitMovementY', 'webkitMovementX', 'dataTransfer', 'toElement',
      'fromElement', 'y', 'x', 'offsetY', 'offsetX', 'relatedTarget', 'button',
      'metaKey', 'altKey', 'shiftKey', 'ctrlKey', 'clientY', 'clientX',
      'screenY', 'screenX', 'pageY', 'pageX', 'layerY', 'layerX',
      'charCode', 'detail', 'view', 'clipboardData', 'cancelBubble',
      'returnValue', 'srcElement', 'defaultPrevented', 'cancelable', 'bubbles',
      'eventPhase', 'currentTarget', 'target', 'type'
    ];
 
  var clickEntry = {
      "dates":[1359439690175],
      "random":[],
      "events":[{
        "time":1359439690174,
        "type":"dom",
        "details":{
          "type":"MouseEvent",
          "details":{
            "type":"click",
            "timeStamp":1359439690173,

            "isTrusted":false,"_reanimator":{"captured":true},
            "shiftKey":false,"toElement":[3,1,"body"],"clientY":30,"y":30,
            "x":163,"ctrlKey":false,"relatedTarget":null,"clientX":163,
            "screenY":0,"metaKey":false,"offsetX":69,"altKey":false,
            "offsetY":20,"fromElement":null,"screenX":0,"dataTransfer":null,
            "button":0,"pageY":30,"layerY":20,"pageX":163,"charCode":0,
            "view":"window","which":1,"keyCode":0,"detail":1,"layerX":69,
            "returnValue":true,"eventPhase":2,"target":[3,1,"body"],
            "defaultPrevented":false,"srcElement":[3,1,"body"],
            "cancelable":true,"currentTarget":[3,1,"body"],"bubbles":true,
            "cancelBubble":false,"MOUSEOUT":8,"FOCUS":4096,"CHANGE":32768,
            "MOUSEMOVE":16,"AT_TARGET":2,"SELECT":16384,"BLUR":8192,
            "KEYUP":512,"MOUSEDOWN":1,"MOUSEDRAG":32,"BUBBLING_PHASE":3,
            "MOUSEUP":2,"CAPTURING_PHASE":1,"MOUSEOVER":4,"CLICK":64,
            "DBLCLICK":128,"KEYDOWN":256,"KEYPRESS":1024,"DRAGDROP":2048
          }
        }
      }]
    };
  var mouseDownEntry = _.cloneDeep(clickEntry);
  var mouseUpEntry = _.cloneDeep(clickEntry);

  mouseDownEntry.events[0].details.details.type = 'mousedown';
  mouseUpEntry.events[0].details.details.type = 'mouseup';

  var keyDownEntry = {
    "dates":[1359439693356],
    "random":[],
    "events":[{
      "time":1359439693356,
      "type":"dom",
      "details":{
        "type":"KeyboardEvent",
        "details":{
          "type":"keydown",
          "timeStamp":1359439693355,
          "_reanimator":{"captured":true},"keyLocation":0,"ctrlKey":false,
          "shiftKey":false,"keyIdentifier":"U+0058","altKey":false,
          "metaKey":false,"altGraphKey":false,"pageY":0,"layerY":0,"pageX":0,
          "charCode":0,"view":"window","which":88,"keyCode":88,"detail":0,
          "layerX":0,"returnValue":true,"eventPhase":2,"target":[3,1,"body"],
          "defaultPrevented":false,"srcElement":[3,1,"body"],"cancelable":true,
          "currentTarget":[3,1,"body"],"bubbles":true,"cancelBubble":false,
          "MOUSEOUT":8,"FOCUS":4096,"CHANGE":32768,"MOUSEMOVE":16,"AT_TARGET":2,
          "SELECT":16384,"BLUR":8192,"KEYUP":512,"MOUSEDOWN":1,"MOUSEDRAG":32,
          "BUBBLING_PHASE":3,"MOUSEUP":2,"CAPTURING_PHASE":1,"MOUSEOVER":4,
          "CLICK":64,"DBLCLICK":128,"KEYDOWN":256,"KEYPRESS":1024,
          "DRAGDROP":2048
        }
      }
    }]
  };
  var keyUpEntry = _.cloneDeep(keyDownEntry);
  var keyPressEntry = _.cloneDeep(keyDownEntry);

  keyUpEntry.events[0].details.details.type = 'keyup';
  keyPressEntry.events[0].details.details.type = 'keypress';

  var changeEntry = {
    "dates":[1359439696215],
    "random":[],
    "events":[{
      "time":1359439696214,
      "type":"dom",
      "details":{
        "type":"Event",
        "details":{
          "type":"change",
          "timeStamp":1359439696213,
          "_reanimator":{"captured":true},"returnValue":true,"eventPhase":2,
          "target":[3,1,"body"],"defaultPrevented":false,
          "srcElement":[3,1,"body"],"cancelable":false,
          "currentTarget":[3,1,"body"],"bubbles":true,"cancelBubble":false,
          "MOUSEOUT":8,"FOCUS":4096,"CHANGE":32768,"MOUSEMOVE":16,"AT_TARGET":2,
          "SELECT":16384,"BLUR":8192,"KEYUP":512,"MOUSEDOWN":1,"MOUSEDRAG":32,
          "BUBBLING_PHASE":3,"MOUSEUP":2,"CAPTURING_PHASE":1,"MOUSEOVER":4,
          "CLICK":64,"DBLCLICK":128,"KEYDOWN":256,"KEYPRESS":1024,
          "DRAGDROP":2048
        }
      }
    }]
  };
  var focusEntry = _.cloneDeep(changeEntry);
  var blurEntry = _.cloneDeep(changeEntry);

  focusEntry.events[0].details.details.type = 'focus';
  blurEntry.events[0].details.details.type = 'blur';

  var logs = {
    click: clickEntry,
    mousedown: mouseDownEntry,
    mouseup: mouseUpEntry,
    keydown: keyDownEntry,
    keyup: keyUpEntry,
    keypress: keyPressEntry,
    change: changeEntry,
    focus: focusEntry,
    blur: blurEntry
  };

  describe('fixes up events of type', function () {
    for (var k in logs) {
      /*jshint loopfunc:true */
      it(k, (function (type, log, done) {
        driver.get(url).
          then(function () {
            return driver.executeAsyncScript(function (type, log, callback) {
              Reanimator.cleanUp();

              $('#target').on(type, function (e) {
                var fixed = {};
                var toFix = e.originalEvent._reanimator.toFix.slice();

                for (var i = 0; i < toFix.length; i++) {
                  fixed[toFix[i]] = e[toFix[i]];
                }

                callback(JSON.stringify({
                  fixed: fixed,
                  toFix: toFix
                }));
              });

              Reanimator.replay(log);
            }, type, log);
          }).
          then(function (result) {
            result = JSON.parse(result);
            var toFix = result.toFix;
            var expected = log.events[0].details.details;
            var actual = result.fixed;

            for (var i = 0; i < toFix.length; i++) {
              expect(actual[toFix[i]]).to.eql(expected[toFix[i]]);
            }

            done();
          });
      }).bind(this, k, logs[k]));
    }
  });
});
