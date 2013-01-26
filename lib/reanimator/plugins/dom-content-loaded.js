/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */
var Reanimator = require('../core');
var serialization = require('../util/event/serialization');
var createEvent = require('../util/event/create');

var _native;

var listeners = [];
function replayAddEventListener(type, listener, useCapture) {
  var args = Array.prototype.slice.call(arguments);
  type = type + '';

  if (type.toLowerCase() === 'domcontentloaded') {
    listeners.push({
      type: type,
      listener: listener,
      useCapture: useCapture
    });
  } else {
    origAddEventListener.apply(document, args);
  }
}

var fired = false;
function beforeReplay(log, config) {
  document.addEventListener('DOMContentLoaded', function () {
    fired = true;
  });

  origAddEventListener = document.addEventListener;
  //origRemoveEventListener = document.removeEventListener;

  document.addEventListener = replayAddEventListener;
  //document.removeEventListener = capture_removeEventListener;
}

function replay(entry, done) {
  function fire(entry, done) {
    document.addEventListener = origAddEventListener;
    // add the queued event listeners
    listeners.forEach(function addQueuedEventListeners(listener) {
      document.addEventListener(
        'DOMContentLoaded', listener.listener, listener.useCapture);
    });

    // fire the event
    var event = createEvent('Event', entry.details.details);
    document.dispatchEvent(event);
    done();
  }

  if (fired) {
    fire(entry, done);
  } else {
    origAddEventListener.
      call(document, 'DOMContentLoaded', function onDomContentLoaded() {
        document.removeEventListener('DOMContentLoaded', onDomContentLoaded);
        fire(entry, done);
      });
  }
}

function capture(log, config) {
  // capture DOMContentLoaded exactly once
  document.addEventListener('DOMContentLoaded', function onDomContentLoaded(e) {
    log.events.push({
      time: _native.Date.now(),
      type: 'dom-content-loaded',
      details: {
        details: serialization.serialize(event)
      }
    });

    document.removeEventListener('DOMContentLoaded', onDomContentLoaded);
  });
}

Reanimator.plug('dom-content-loaded', {
  init: function init(native) {
    _native = native;
  },
  capture: capture,
  beforeReplay: beforeReplay,
  replay: replay,
  cleanUp: function cleanUp() {/* NOP */}
});
