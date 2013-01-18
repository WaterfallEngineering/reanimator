/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');
var serialize = require('../util/event/serialize');

var _native, _log;

var triggered;

function getJQueryHandlerFn(fn) {
  return function (event) {
    var originalEvent = event.originalEvent;
    var entry;
    
    if (triggered < 1) {
      // event is not triggered, so capture it
      entry = {
        time: _native.Date.now(),
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

      entry.details = serialize(originalEvent);

      _log.events.push(entry);
    }

    fn.apply(this, Array.prototype.slice.call(arguments));
  };
}


function returnFalse() {
  return false;
}

var $on, $trigger, $fix;
function capture_on( types, selector, data, fn, /*INTERNAL*/ one ) {
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
  fn = getJQueryHandlerFn(fn);
  result = $on.call(this, types, selector, data, fn, one);

  // Use same guid so caller can remove using origFn
  origFn.guid = fn.guid;

  return result;
}

function capture_trigger() {
  // triggered events are deterministic, so ignore them
  triggered++;
  $trigger.apply(this, Array.prototype.slice.call(arguments));
  triggered--;
}

function jquery_capture(log, config) {
  _log = log;

  $on = $.fn.on;
  $trigger = $.fn.trigger;
  $fix = $.event.fix;

  Reanimator.state = Reanimator.state || {};
  triggered = 0;

  $.fn.on = capture_on;

  $.fn.trigger = capture_trigger;
}

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

function jquery_replay(event) {
  var create = eventCreators[event.domEventType];

  $fix = $.event.fix;

  if (!create) {
    // XXX: Are we sure we want to throw here? Might make sense to just
    // default to Event and maybe log a warning to the console
    throw 'Cannot dispatch event of type "' + event.domEventType + '"';
  }
  
  var domEvent = create(event.details);

  $.event.fix = fix;
  traverseToElement(event.details.target).dispatchEvent(domEvent);
  $.event.fix = $fix;
}

Reanimator.plug('jquery', {
  init: function init(native) {
    _native = native;
  },
  capture: jquery_capture,
  beforeReplay: function (log, config) { /* NOP */ },
  replay: jquery_replay,
  cleanUp: function jquery_cleanUp() {
    $.fn.on = $on;
    $.fn.trigger = $trigger;
  }
});
