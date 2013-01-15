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
    native.random = global.Math.random;

    capture.random = function () {
      var result = native.random.call(Math);

      log.random.push(result);
      return result;
    };

    replay.random = function () {
      return log.random.pop();
    };
  }());

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
      case 'jquery':
        plugins.jquery.replayEvent(event);
        break;
      default:
        throw 'Unknown event of type "' + event.type + '"';
      }

      if (log.events.length > 0) {
        setTimeout(replayLoop, 0);
      }
    };
  }());

  var plugins = {};
  (function () {
    plugins.jquery = {
      stack: []
    };

    function getJQueryHandlerFn(fn) {
      return function (event) {
        var originalEvent = event.originalEvent;
        var entry;
        
        if (Reanimator.state.triggered < 1) {
          // event is not triggered, so capture it
          entry = {
            time: native.Date.now(),
            type: 'jquery'
          };

          if (global.MouseEvent && originalEvent instanceof MouseEvent) {
            entry.domEventType = 'MouseEvent';
          } else if (global.KeyboardEvent && 
              originalEvent instanceof KeyboardEvent
          ) {
            entry.domEventType = 'KeyboardEvent';
          } else if (global.UIEvent && originalEvent instanceof UIEvent) {
            entry.domEventType = 'UIEvent';
          } else if (global.CustomEvent &&
              originalEvent instanceof CustomEvent
          ) {
            entry.domEventType = 'CustomEvent';
          } else {
            entry.domEventType = 'Event';
          }

          entry.details = Reanimator.util.event.serialize(originalEvent);

          log.events.push(entry);
        }

        fn.apply(this, argsToArray(arguments));
      };
    }


    function returnFalse() {
      return false;
    }

    var $on, $trigger, $fix;
    plugins.jquery.capture = function (log) {
      /*jshint eqnull:true */

      $on = $.fn.on;
      $trigger = $.fn.trigger;
      $fix = $.event.fix;

      Reanimator.state = Reanimator.state || {};
      Reanimator.state.triggered = 0;

      $.fn.on = function( types, selector, data, fn, /*INTERNAL*/ one ) {
        /* modified from jQuery 1.8.3 implementation */
        var origFn, type, result;

        // Types can be a map of types/handlers
        if ( typeof types === "object" ) {
          // ( types-Object, selector, data )
          if ( typeof selector !== "string" ) { // && selector != null
            // ( types-Object, data )
            data = data || selector;
            selector = undefined;
          }
          for ( type in types ) {
            this.on( type, selector, data, types[ type ], one );
          }
          return this;
        }

        if ( data == null && fn == null ) {
          // ( types, fn )
          fn = selector;
          data = selector = undefined;
        } else if ( fn == null ) {
          if ( typeof selector === "string" ) {
            // ( types, selector, fn )
            fn = data;
            data = undefined;
          } else {
            // ( types, data, fn )
            fn = data;
            data = selector;
            selector = undefined;
          }
        }

        if ( fn === false ) {
          fn = returnFalse;
        } else if ( !fn ) {
          return this;
        }

        origFn = fn;
        fn = getJQueryHandlerFn(fn);
        result = $on.call(this, types, selector, data, fn, one);

        // Use same guid so caller can remove using origFn
        origFn.guid = fn.guid;

        return result;
      };

      $.fn.trigger = function () {
        // triggered events are deterministic, so ignore them
        Reanimator.state.triggered++;
        $trigger.apply(this, argsToArray(arguments));
        Reanimator.state.triggered--;
      };
    };

    function traverseToElement(traversal) {
      var el = document;
      var originalTraversal = traversal ? traversal.slice() : traversal;

      // FIXME: doesn't handle window
      if (traversal === null) {
        return null;
      } else if (traversal.length === 0) {
        return document;
      }

      var index = traversal.pop();
      if (index === 'head') {
        el = el.head;
      } else if (index === 'body') {
        el = el.body;
      } else {
        throw 'Cannot traverse into unknown element "' + index + '"';
      }

      while (traversal.length > 0) {
        el = el.childNodes[traversal.pop()];
      }

      return el;
    }

    var currEvent;
    function fix(event) {
      var k;

      if (event === currEvent.event) {
        event = $fix.call($.event, event);

        while (currEvent.toFix.length > 0) {
          k = currEvent.toFix.pop();
          event[k] = currEvent.details[k];
        }
      } else {
        event = $fix.call($.event, event);
      }
      return event;
    }

    var eventCreators = {
      Event: function (details) {
        var event = document.createEvent('Event');

        event.initEvent(details.type, details.bubbles, details.cancelable);

        currEvent = {
          event: event,
          details: details,
          toFix: ['timeStamp']
        };

        return event;
      },

      UIEvent: function (details) {
        var event = document.createEvent('UIEvent');

        /*
         * initUIEvent(type, canBubble, cancelable, view, detail)
         */
        event.initUIEvent(details.type, details.bubbles, details.cancelable,
          global, details.detail);

        currEvent = {
          event: event,
          details: details,
          toFix: ['timeStamp']
        };

        return event;
      },

      FocusEvent: function (details) {
        var event = document.createEvent('FocusEvent');

        /*
         * initFocusEvent(eventType, canBubble, cancelable, viewArg, detailArg,
         *   relatedTargetArg)
         */
        event.initFocusEvent(details.type, details.bubbles, details.cancelable,
          global, details.detail, traverseToElement(details.relatedTarget));

        currEvent = {
          event: event,
          details: details,
          toFix: ['timeStamp']
        };

        return event;
      },

      MouseEvent: function (details) {
        var event = document.createEvent('MouseEvent');

        /*
         * event.initMouseEvent(type, canBubble, cancelable, view, detail,
         *   screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey,
         *   metaKey, button, relatedTarget);
         */
        event.initMouseEvent(details.type, details.bubbles, details.cancelable,
          global, details.detail,
          details.screenX, details.screenY, details.clientX, details.clientY,
          details.ctrlKey, details.altKey, details.shiftKey, details.metaKey, 
          details.button, traverseToElement(details.relatedTarget));

        currEvent = {
          event: event,
          details: details,
          toFix: ['timeStamp']
        };

        return event;
      },

      KeyboardEvent: function (details) {
        var event = document.createEvent('KeyboardEvent');
        var modifiers = [];

        if (details.altKey) {
          modifiers.push('Alt');
        }

        if (details.ctrlKey) {
          modifiers.push('Control');
        }

        if (details.metaKey) {
          modifiers.push('Meta');
        }
        
        if (details.shiftKey) {
          modifiers.push('Shift');
        }


        if (document.attachEvent) {
          // IE

          /*
           * initKeyboardEvent(eventType, canBubble, cancelable, viewArg,
           *   keyArg, locationArg, modifiersListArg, repeat, locale);
           */
          // FIXME: is there a better way to detect IE here?
          event.initKeyboardEvent(details.type,
            details.bubbles, details.cancelable, global,
            details.keyCode, details.keyLocation,
            modifiers.join(' '), details.repeat, '');
        } else if (event.initKeyboardEvent) {
          // WebKit and Opera?
          /*
          void initKeyboardEvent(
            in DOMString typeArg,
            in boolean canBubbleArg,
            in boolean cancelableArg,
            in views::AbstractView viewArg,
            in DOMString charArg,
            in DOMString keyArg,
            in unsigned long locationArg,
            in DOMString modifiersListArg,
            in boolean repeat,
            in DOMString localeArg // not implemented in WebKit
          )
          */
          event.initKeyboardEvent(details.type,
            details.bubbles, details.cancelable, global,
            details.charCode, details.keyCode, details.keyLocation,
            modifiers.join(' '), details.repeat);
        } else if (event.initKeyEvent) {
          // Firefox

          /*
           * initKeyEvent(type, bubbles, cancelable, viewArg, ctrlKeyArg,
           *   altKeyArg, shiftKeyArg, metaKeyArg, keyCodeArg, charCodeArg)
           */
          event.initKeyEvent(details.type,
            details.bubbles, details.cancelable, global,
            details.ctrlKey, details.altKey, details.shiftKey, details.metaKey, 
            details.keyCode, details.charCode);
        } else {
          // init as Event
          event.initEvent(details.type, details.bubbles, details.cancelable);
        }

        currEvent = {
          event: event,
          details: details,
          toFix: [
            'which', 'altGraphKey', 'metaKey', 'altKey', 'shiftKey', 'ctrlKey',
            'keyLocation', 'keyIdentifier', 'pageY', 'pageX', 'layerY',
            'layerX', 'charCode', 'keyCode', 'detail', 'view', 'clipboardData',
            'timeStamp'
          ]
        };

        return event;
      }
    };

    plugins.jquery.replayEvent = function (entry) {
      var create = eventCreators[entry.domEventType];

      $fix = $.event.fix;

      if (!create) {
        // XXX: Are we sure we want to throw here? Might make sense to just
        // default to Event and maybe log a warning to the console
        throw 'Cannot dispatch event of type "' + entry.domEventType + '"';
      }
      
      var event = create(entry.details);

      $.event.fix = fix;
      traverseToElement(entry.details.target).dispatchEvent(event);
      $.event.fix = $fix;
    };

    plugins.jquery.cleanUp = function () {
      $.fn.on = $on;
      $.fn.trigger = $trigger;
    };
  }());

  global.Reanimator = {
    capture: function () {
      global.Math.random = capture.random;
      global.Date = capture.Date;
      global.setTimeout = capture.setTimeout;
      global.setInterval = capture.setInterval;

      capture.setTimeout.id = 0;

      plugins.jquery.capture(log);

      log = {
        dates: [],
        random: [],
        events: []
      };
    },

    replay: function (replayLog) {
      var setTimeout = native.setTimeout;
      global.Math.random = replay.random;
      global.Date = replay.Date;
      global.setTimeout = replay.setTimeout;

      Reanimator.log = log = replayLog;

      replay.setTimeout.id = 0;
      replay.setTimeout.handlers = {};

      // clone the dates and events arrays, then reverse them so we can pop
      // when we want the next event instead of shifting
      log.dates = (log.dates || []).slice().reverse();
      log.random = (log.random || []).slice().reverse();
      log.events = (log.events || []).slice().reverse();

      if (log.events.length > 0) {
        setTimeout(replay.loop, 100);
      }
    },

    cleanUp: function () {
      global.Math.random = native.random;
      global.Date = native.Date;
      global.setTimeout = native.setTimeout;
      global.setInterval = native.setInterval;

      plugins.jquery.cleanUp();
    },

    flush: function () {
      return JSON.parse(JSON.stringify(log));
    }
  };
}(this));
