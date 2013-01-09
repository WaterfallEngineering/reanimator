/* vim: set et ts=2 sts=2 sw=2: */
/*jshint evil:true */

(function (global) {
  var native = {};
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

  var _Date;
  (function () {
    native.Date = global.Date;

    _Date = function (year, month, day, hours, minutes, seconds, ms) {
      var date;

      if (this instanceof _Date) {
        // called as a constructor, return a Date instance

        if (arguments.length < 1) {
          date = new native.Date();
          log.dates.push(native.Date.parse(date));
        } else {
          date = new native.Date(year, month, day, hours, minutes, seconds, ms);
        }
      } else {
        // called as a function, return the current time as a string

        date = native.Date();
        log.dates.push(native.Date.parse(date));
      }

      return date;
    };

    _Date.prototype = Object.create(native.Date.prototype);
    _Date.UTC = native.Date.UTC.bind(native.Date);
    _Date.parse = native.Date.parse.bind(native.Date);

    _Date.now = function () {
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

  var _setTimeout;
  (function () {
    var timeoutId = 0;

    native.setTimeout = global.setTimeout;

    _setTimeout = function (code, delay) {
      var args = argsToArray(arguments).slice(1);
      var handle;

      if (typeof code === 'string') {
        code = new Function(code);
      }

      return native.setTimeout.apply(global,
          [getHandlerFn('setTimeout', code, timeoutId++)].concat(args));
    };
  }());

  var _setInterval;
  (function () {
    var intervalId = 0;

    native.setInterval = global.setInterval;

    _setInterval = function (code, delay) {
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
      global.Date = _Date;
      global.setTimeout = _setTimeout;
      global.setInterval = _setInterval;

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
