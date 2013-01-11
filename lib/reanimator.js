/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */

(function (global) {
  var native = {};
  var capture = {};
  var replay = {};
  var log;

  function argsToArray(args) {
    return Array.prototype.slice.call(args);
  }

  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function

        throw new TypeError('Function.prototype.bind - ' +
          'what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof Function && oThis ? this : oThis,
            aArgs.concat(Array.prototype.slice.call(arguments)));
        };

      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();

      return fBound;
    };
  }

  (function () {
    var prototypeMethods = Object.getOwnPropertyNames(global.Date.prototype);

    native.Date = global.Date;

    function _Date(replaying, year, month, day, hours, minutes, seconds, ms) {
      var date;

      if (this instanceof Date) {
        // called as a constructor, return a Date instance

        if (arguments.length < 2) {
          if (!replaying) {
            date = this._value = new native.Date();
            log.dates.push(native.Date.parse(date));
          } else {
            this._value = log.dates.pop();
          }
        } else {
          switch (arguments.length) {
          case 2:
            this._value = new native.Date(year);
            break;
          case 3:
            this._value = new native.Date(year, month);
            break;
          case 4:
            this._value = new native.Date(year, month, day);
            break;
          case 5:
            this._value = new native.Date(year, month, day, hours);
            break;
          case 6:
            this._value = new native.Date(year, month, day, hours, minutes);
            break;
          case 7:
            this._value =
              new native.Date(year, month, day, hours, minutes, seconds);
            break;
          default:
            this._value =
              new native.Date(year, month, day, hours, minutes, seconds, ms);
            break;
          }
        }
      } else {
        // called as a function, return the current time as a string

        if (!replaying) {
          date = native.Date();
          log.dates.push(native.Date.parse(date));
        } else {
          date = (new native.Date(log.dates.pop())).toString();
        }

        return date;
      }

      return this;
    }

    // Construct a prototype that delegates to a native Date instance stored in
    // the instance's _value property
    var _Date_prototype = {};
    prototypeMethods.forEach(function (method) {
      _Date_prototype[method] = function () {
        return this._value[method].apply(this._value, argsToArray(arguments));
      };
    });

    capture.Date = function capture_Date () {
      return _Date.apply(this, [false].concat(argsToArray(arguments)));
    };

    capture.Date.prototype = _Date_prototype;
    capture.Date.UTC = native.Date.UTC.bind(native.Date);
    capture.Date.parse = native.Date.parse.bind(native.Date);

    capture.Date.now = function capture_Date_now () {
      var now = native.Date.now();
      log.dates.push(now);
      return now;
    };

    replay.Date = function replay_Date () {
      return _Date.apply(this, [true].concat(argsToArray(arguments)));
    };

    replay.Date.prototype = _Date_prototype;
    replay.Date.UTC = native.Date.UTC.bind(native.Date);
    replay.Date.parse = native.Date.parse.bind(native.Date);

    replay.Date.now = function replay_Date_now () {
      return log.dates.pop();
    };
  }());

  function getHandlerFn(type, fn, id) {
    return function () {
      log.events.push({
        type: type,
        id: id,
        time: native.Date.now()
      });
      fn.apply(this, argsToArray(arguments));
    };
  }

  (function () {
    native.setTimeout = global.setTimeout;

    capture.setTimeout = function (code, delay) {
      var args = argsToArray(arguments).slice(1);
      var handle;

      if (typeof code === 'string') {
        code = new Function(code);
      }

      return native.setTimeout.apply(global,
          [getHandlerFn('setTimeout', code, capture.setTimeout.id++)].
            concat(args));
    };

    replay.setTimeout = function (code, delay) {
      var args = argsToArray(arguments).slice(2);
      var handle;

      if (typeof code === 'string') {
        code = new Function(code);
      }

      var id = replay.setTimeout.id;
      replay.setTimeout.handlers[id] = {
        fn: code,
        args: args
      };
      replay.setTimeout.id++;

      return id;
    };
  }());

  (function () {
    var intervalId = 0;

    native.setInterval = global.setInterval;

    capture.setInterval = function (code, delay) {
      var args = argsToArray(arguments).slice(1);
      var handle;

      if (typeof code === 'string') {
        code = new Function(code);
      }

      return native.setInterval.apply(global,
          [getHandlerFn('setInterval', code, intervalId++)].concat(args));
    };
  }());

  (function () {
    var setTimeout = native.setTimeout;

    replay.loop = function replayLoop() {
      var event = log.events.pop();
      var handler;

      // FIXME: Should be dispatched by type from an object of event handlers
      switch (event.type) {
      case 'setTimeout':
        handler = replay.setTimeout.handlers[event.id];
        setTimeout.apply(global, [handler.fn, 0].concat(handler.args));
        break;
      case 'setInterval':
        break;
      default:
        throw 'Unknown event of type "' + event.type + '"';
      }

      if (log.events.length > 0) {
        setTimeout(replayLoop, 0);
      }
    };
  }());

  global.Reanimator = {
    capture: function () {
      global.Date = capture.Date;
      global.setTimeout = capture.setTimeout;
      global.setInterval = capture.setInterval;

      capture.setTimeout.id = 0;

      log = {
        dates: [],
        events: []
      };
    },

    replay: function (replayLog) {
      var setTimeout = native.setTimeout;
      global.Date = replay.Date;
      global.setTimeout = replay.setTimeout;

      log = replayLog;

      replay.setTimeout.id = 0;
      replay.setTimeout.handlers = {};

      // clone the dates and events arrays, then reverse them so we can pop
      // when we want the next event instead of shifting
      log.dates = (log.dates || []).slice().reverse();
      log.events = (log.events || []).slice().reverse();

      if (log.events.length > 0) {
        setTimeout(replay.loop, 0);
      }
    },

    cleanUp: function () {
      global.Date = native.Date;
      global.setTimeout = native.setTimeout;
      global.setInterval = native.setInterval;
    },

    flush: function () {
      return JSON.parse(JSON.stringify(log));
    }
  };
}(this));
