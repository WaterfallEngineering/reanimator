/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');

var replay = {};
var _native, _log;

// Date implementation for both capture and replay
function _Date(replaying, year, month, day, hours, minutes, seconds, ms) {
  var argsLen = arguments.length;
  var date;

  if (this instanceof Date) {
    // called as a constructor, return a Date instance

    if (argsLen < 2) {
      if (!replaying) {
        date = this._value = new _native.Date();
        _log.dates.push(_native.Date.parse(date));
      } else {
        this._value = new _native.Date(_log.dates.pop());
      }
    } else if (argsLen === 2) {
      this._value = new _native.Date(year);
    } else if (argsLen === 3) {
      this._value = new _native.Date(year, month);
    } else if (argsLen === 4) {
      this._value = new _native.Date(year, month, day);
    } else if (argsLen === 5) {
      this._value = new _native.Date(year, month, day, hours);
    } else if (argsLen === 6) {
      this._value = new _native.Date(year, month, day, hours, minutes);
    } else if (argsLen === 7) {
      this._value =
        new _native.Date(year, month, day, hours, minutes, seconds);
    } else {
      this._value =
        new _native.Date(year, month, day, hours, minutes, seconds, ms);
    }

    return this;
  } else {
    // called as a function, return the current time as a string

    if (!replaying) {
      date = _native.Date();
      _log.dates.push(_native.Date.parse(date));
    } else {
      date = (new _native.Date(_log.dates.pop())).toString();
    }

    return date;
  }
}

// Construct a prototype that delegates to a native Date instance stored in
// the instance's _value property
var prototypeMethods = Object.getOwnPropertyNames(global.Date.prototype);
var _Date_prototype = {};
prototypeMethods.forEach(function (method) {
  _Date_prototype[method] = function () {
    return this._value[method].
      apply(this._value, Array.prototype.slice.call(arguments));
  };
});

function capture_Date () {
  return _Date.
    apply(this, [false].concat(Array.prototype.slice.call(arguments)));
}

capture_Date.prototype = _Date_prototype;
capture_Date.UTC = global.Date.UTC.bind(global.Date);
capture_Date.parse = global.Date.parse.bind(global.Date);

capture_Date.now = function capture_Date_now () {
  var now = _native.Date.now();
  _log.dates.push(now);
  return now;
};

function replay_Date () {
  return _Date.
    apply(this, [true].concat(Array.prototype.slice.call(arguments)));
}

replay_Date.prototype = _Date_prototype;
replay_Date.UTC = global.Date.UTC.bind(global.Date);
replay_Date.parse = global.Date.parse.bind(global.Date);

replay_Date.now = function replay_Date_now () {
  return _log.dates.pop();
};

Reanimator.plug('date', {
  init: function init(native) {
    _native = native;
    _native.Date = global.Date;
  },

  capture: function capture(log, config) {
    _log = log;
    global.Date = capture_Date;
  },

  beforeReplay: function replay(log, config) {
    _log = log;
    global.Date = replay_Date;
  },

  cleanUp: function () {
    _log = null;
    global.Date = _native.Date;
  }
});
