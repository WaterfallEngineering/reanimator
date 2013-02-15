/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */
var Reanimator = require('../core');
var serialization = require('../util/event/serialization');
var getType = require('../util/event/types').getType;
var createEvent = require('../util/event/create');

var _native;
var origAddEventListener, origRemoveEventListener;

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

function replayRemoveEventListener(type, listener, useCapture) {
  var args = Array.prototype.slice.call(arguments);
  type = type + '';

  if (type.toLowerCase() === 'domcontentloaded') {
    listeners = listeners.filter(function (record) {
      return record.listener !== listener || record.useCapture !== useCapture;
    });
  } else {
    origRemoveEventListener.apply(document, args);
  }
}

var fired = false;
function beforeReplay(log, config) {
  document.addEventListener('DOMContentLoaded', function () {
    fired = true;
  });

  document.addEventListener = replayAddEventListener;
  document.removeEventListener = replayRemoveEventListener;
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
        origRemoveEventListener.
          call(document, 'DOMContentLoaded', onDomContentLoaded, false);
        fire(entry, done);
      });
  }
}

var hookedEvents = {};
function logEvent(ev) {
  ev._reanimator = ev._reanimator || {};

  if (ev.target === window &&
      !ev._reanimator.captured && !ev._reanimator.synthetic
  ) {
    _log.events.push({
      time: _native.Date.now(),
      type: 'dom',
      details: {
        type: getType(ev),
        details: serialization.serialize(ev)
      }
    });
    ev._reanimator.captured = true;
  }
}

function captureAddEventListener(type, fn, capturing) {
  if (!hookedEvents[type]) {
    origAddEventListener.call(window, type, logEvent, true);
    hookedEvents[type] = true;
  }

  origAddEventListener.call(window, type, fn, capturing);
}

var whitelist = {
  'hashchange': true,
  'popstate': true
};

function capture(log, config) {
  _log = log;
  window.addEventListener = captureAddEventListener;

  var type;
  for (var k in window) {
    type = k.slice(2);
    if (k.indexOf('on') >= 0 && whitelist[type] === true) {
      origAddEventListener.call(window, type, logEvent, true);
      hookedEvents[type] = true;
    }
  }
}

Reanimator.plug('window', {
  init: function init(native) {
    _native = native;
    origAddEventListener = window.addEventListener;
    origRemoveEventListener = window.removeEventListener;
  },
  capture: capture,
  beforeReplay: function () {},
  replay: function () {},
  cleanUp: function cleanUp() {
    window.addEventListener = origAddEventListener;
    window.removeEventListener = origRemoveEventListener;
  }
});
