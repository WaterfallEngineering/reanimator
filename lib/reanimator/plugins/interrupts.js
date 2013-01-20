/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */
var Reanimator = require('../core');

var replay = {};
var _native, _log;

function getHandlerFn(type, fn, id) {
  return function () {
    _log.events.push({
      type: type,
      details: {
        id: id
      },
      time: _native.Date.now()
    });
    fn.apply(this, Array.prototype.slice.call(arguments));
  };
}

function capture_setTimeout(code, delay) {
  var args = Array.prototype.slice.call(arguments, 1);
  var handle;

  if (typeof code === 'string') {
    code = new Function(code);
  }

  return _native.setTimeout.apply(global, [
      getHandlerFn('setTimeout', code, capture_setTimeout.id++)
    ].concat(args));
}

function replay_setTimeout(code, delay) {
  var args = Array.prototype.slice.call(arguments, 2);
  var id = replay_setTimeout.id;
  var handle;

  if (typeof code === 'string') {
    code = new Function(code);
  }

  replay_setTimeout.handlers[id] = {
    fn: code,
    args: args
  };
  replay_setTimeout.id++;

  return id;
}

function capture_setInterval(code, delay) {
  var args = Array.prototype.slice.call(arguments, 1);
  var handle;

  if (typeof code === 'string') {
    code = new Function(code);
  }

  return _native.setInterval.apply(global, [
      getHandlerFn('setInterval', code, capture_setInterval.id++)
    ].concat(args));
}

function replay_setInterval(code, delay) {
  var args = Array.prototype.slice.call(arguments, 2);
  var id = replay_setInterval.id;
  var handle;

  if (typeof code === 'string') {
    code = new Function(code);
  }

  replay_setInterval.handlers[id] = {
    fn: code,
    args: args
  };
  replay_setInterval.id++;

  return id;
}

Reanimator.plug('setTimeout', {
  init: function init(native) {
    _native = native;
    _native.setTimeout = global.setTimeout;
  },

  capture: function capture(log, config) {
    _log = log;
    global.setTimeout = capture_setTimeout;
    capture_setTimeout.id = 0;
  },

  beforeReplay: function replay(log, config) {
    _log = log;
    global.setTimeout = replay_setTimeout;
    replay_setTimeout.id = 0;
    replay_setTimeout.handlers = {};
  },

  replay: function (event) {
    var handler = replay_setTimeout.handlers[event.details.id];
    // schedule the callback for the next tick
    _native.setTimeout.apply(global, [handler.fn, 0].concat(handler.args));
  },

  cleanUp: function () {
    _log = null;
    global.setTimeout = _native.setTimeout;
  }
});

Reanimator.plug('setInterval', {
  init: function init(native) {
    _native = native;
    _native.setInterval = global.setInterval;
  },

  capture: function capture(log, config) {
    _log = log;
    global.setInterval = capture_setInterval;
    capture_setInterval.id = 0;
  },

  beforeReplay: function replay(log, config) {
    _log = log;
    global.setInterval = replay_setInterval;
    replay_setInterval.id = 0;
    replay_setInterval.handlers = {};
  },

  replay: function (event) {
    var handler = replay_setInterval.handlers[event.details.id];
    // schedule the callback for the next tick
    _native.setTimeout.apply(global, [handler.fn, 0].concat(handler.args));
  },

  cleanUp: function () {
    _log = null;
    global.setInterval = _native.setInterval;
  }
});
