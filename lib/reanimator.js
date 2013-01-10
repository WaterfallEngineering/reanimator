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
          }
        } else {
          this._value =
            new native.Date(year, month, day, hours, minutes, seconds, ms);
        }
      } else {
        // called as a function, return the current time as a string

        if (!replaying) {
          date = native.Date();
          log.dates.push(native.Date.parse(date));
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
    var timeoutId = 0;

    native.setTimeout = global.setTimeout;

    capture.setTimeout = function (code, delay) {
      var args = argsToArray(arguments).slice(1);
      var handle;

      if (typeof code === 'string') {
        code = new Function(code);
      }

      return native.setTimeout.apply(global,
          [getHandlerFn('setTimeout', code, timeoutId++)].concat(args));
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

  global.Reanimator = {
    capture: function () {
      global.Date = capture.Date;
      global.setTimeout = capture.setTimeout;
      global.setInterval = capture.setInterval;

      log = {
        dates: [],
        events: []
      };
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
