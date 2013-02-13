/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');

var _native, _log;

/**
 * Capture all keys in localStorage in index order
 */
function snapshot() {
  var len = localStorage.length;
  var state = new Array(len);

  for (var i = 0, k; i < len; i++) {
    k = localStorage.key(i);
    state[i] = {
      key: k,
      value: localStorage[k]
    };
  }

  return state;
}

/**
 * Set localStorage to state captured in a snapshot
 */
function restore(snapshot) {
  localStorage.clear();
  for (var i = 0, len = snapshot.length; i < len; i++) {
    localStorage[snapshot[i].key] = snapshot[i].value;
  }
}

Reanimator.plug('local-storage', {
  init: function init(native) {
    _native = native;
    _native.localStorage_getItem = window.localStorage.getItem;
    _native.localStorage_setItem = window.localStorage.setItem;
    _native.localStorage_clear = window.localStorage.clear;
  },
  capture: function xhr_capture(log, config) {
    _log = log;

    _log.localStorage = {
        state: snapshot()
    };
  },
  beforeReplay: function (log, config) {
    var k;

    _log = log;

    _log.localStorage = _log.localStorage || {};

    _log.localStorage.preReplayState = snapshot();

    _log.localStorage.state = _log.localStorage.state || [];
    restore(_log.localStorage.state);
  },
  cleanUp: function xhr_cleanUp() {
    restore(_log.localStorage.preReplayState || []);
    window.localStorage.getItem = _native.localStorage_getItem;
    window.localStorage.setItem = _native.localStorage_setItem;
    window.localStorage.clear = _native.localStorage_clear;
  }
});
