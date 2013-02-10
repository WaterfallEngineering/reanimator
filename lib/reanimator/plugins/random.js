/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */
var Reanimator = require('../core');

var replay = {};
var _native, _log;


capture_random = function () {
  var result = _native.random.call(Math);

  _log.random.push(result);
  return result;
};

replay_random = function () {
  return _log.random.pop();
};

Reanimator.plug('random', {
  init: function init(native) {
    _native = native;
    _native.random = global.Math.random;
  },

  capture: function capture(log, config) {
    _log = log;
    _log.random = [];
    global.Math.random = capture_random;
  },

  beforeReplay: function replay(log, config) {
    _log = log;
    _log.random = (_log.random || []).slice().reverse();
    global.Math.random = replay_random;
  },

  cleanUp: function () {
    _log = null;
    global.Math.random = _native.random;
  }
});
