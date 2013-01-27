/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');
var serialization = require('../util/event/serialization');

var _native, _log;

var triggered;

function getCaptureOnHandlerFn(fn) {
  return function (event) {
    var originalEvent = event.originalEvent;
    var entry;
    
    /*
     * Only log the event if it is not synthetic and hasn't been logged yet.
     *
     * - Events from `$.fn.trigger` do not have an `originalEvent` property.
     * - Events from `document.createEvent` will have `_reanimator.synthetic`
     *   set to `true`
     * - Events that have already been captured will have `_reanimator.captured`
     *   set to `true`
     */
    if (originalEvent && (
        !originalEvent._reanimator ||
        (
          !originalEvent._reanimator.captured &&
          !originalEvent._reanimator.synthetic
        )
      )
    ) {
      originalEvent._reanimator = originalEvent._reanimator || {};
      originalEvent._reanimator.captured = true;

      entry = {
        time: _native.Date.now(),
        type: 'dom',
        details: {}
      };

      if (global.MouseEvent && originalEvent instanceof MouseEvent) {
        entry.details.type = 'MouseEvent';
      } else if (global.KeyboardEvent && 
          originalEvent instanceof KeyboardEvent
      ) {
        entry.details.type = 'KeyboardEvent';
      } else if (global.UIEvent && originalEvent instanceof UIEvent) {
        entry.type = 'UIEvent';
      } else if (global.CustomEvent && originalEvent instanceof CustomEvent) {
        entry.details.type = 'CustomEvent';
      } else {
        entry.details.type = 'Event';
      }

      entry.details.details = serialization.serialize(originalEvent);

      _log.events.push(entry);
    }

    fn.apply(this, Array.prototype.slice.call(arguments));
  };
}


function returnFalse() {
  return false;
}

var $on, $trigger, $fix;
var getOnHandlerFn;
function on( types, selector, data, fn, /*INTERNAL*/ one ) {
  /*jshint eqnull:true */
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
  fn = getOnHandlerFn(fn);
  result = $on.call(this, types, selector, data, fn, one);

  // Use same guid so caller can remove using origFn
  origFn.guid = fn.guid;

  return result;
}

/*
function capture_trigger() {
  var result;
  // triggered events are deterministic, so ignore them
  triggered++;
  result = $trigger.apply(this, Array.prototype.slice.call(arguments));
  triggered--;
  return result;
}
*/

function jquery_capture(log, config) {
  _log = log;

  getOnHandlerFn = getCaptureOnHandlerFn;

  $on = $.fn.on;
  $fix = $.event.fix;

  $.fn.on = on;
}

function getReplayOnHandlerFn(fn) {
  return function (event) {
    fix(event);
    fn.apply(this, Array.prototype.slice.call(arguments));
  };
}

function fix(event) {
  var toFix, k;

  if (event._reanimator) {
    toFix = event._reanimator.toFix || [];
  }

  event = $fix.call($.event, event);
  while (toFix && toFix.length > 0) {
    k = toFix.pop();
    event[k] = event._reanimator.entry.details[k];
  }

  return event;
}

Reanimator.plug('jquery', {
  init: function init(native) {
    _native = native;
  },
  capture: jquery_capture,
  beforeReplay: function (log, config) {
    getOnHandlerFn = getReplayOnHandlerFn;

    $on = $.fn.on;
    $fix = $.event.fix;
    $.fn.on = on;
    $.event.fix = fix;
  },
  cleanUp: function jquery_cleanUp() {
    $.fn.on = $on;
    $.event.fix = $fix;
  }
});
