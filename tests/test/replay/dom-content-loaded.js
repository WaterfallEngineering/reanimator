/* vim: set et ts=2 sts=2 sw=2: */
var expect = require('expect.js');

describe('Reanimator replays DOMContentLoaded', function () {
  var build = require('../../util/hooks').build;
  var url = 'http://localhost:' +
    process.env.FIXTURE_PORT +'/dom-content-loaded-replay.html';
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

  // TODO: We need more tests here, but I can't think of any useful ones at the
  //       moment
  it('replays callbacks registered by addEventListener', function (done) {
    driver.get(url + '#addEventListener').
      then(function () {
        return driver.executeScript(function () {
          Reanimator.cleanUp();
          return JSON.stringify({
            replayed: window.replayed,
            replayedTime: window.replayedTime,
            replayedEvent: window.replayedEvent
          });
        });
      }).
      then(function (result) {
        result = JSON.parse(result);

        expectedKeys.forEach(function (k) {
          expect(result.replayed[k]).
            to.eql(result.replayedEvent.details.details[k]);
        });

        expect(result.replayedTime).
          to.be.above(result.replayedEvent.time - 5);
        expect(result.replayedTime).
          to.be.below(result.replayedEvent.time + 5);
        done();
      });
  });
});
