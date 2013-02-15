/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../../core');

function createEvent(type) {
  var ev;

  if (window[type]) {
    try {
      ev = document.createEvent(type);
      return ev;
    } catch (e) {
      if (e.message.toLowerCase().indexOf('dom exception') < 0) {
        throw e;
      }
      // fall thru
    }
  }

  ev = document.createEvent('Event');
  return ev;
}

var eventCreators = {
  Event: function (details) {
    var event = document.createEvent('Event');

    event.initEvent(details.type, details.bubbles, details.cancelable);

    event._reanimator = {
      toFix: ['timeStamp']
    };

    return event;
  },

  HashChangeEvent: function (details) {
    var event = createEvent('HashChangeEvent');

    if (window.HashChangeEvent && event instanceof HashChangeEvent) {
      event.initHashChangeEvent(details.type,
        details.bubbles, details.cancelable,
        details.oldUrl, details.newUrl);
    } else {
      event.initEvent(details.type, details.bubbles, details.cancelable);
      event.oldUrl = details.oldUrl;
      event.newUrl = details.newUrl;
    }

    event._reanimator = {
      toFix: ['timeStamp']
    };

    return event;
  },

  PopStateEvent: function (details) {
    var event = createEvent('PopStateEvent');

    if (window.PopStateEvent &&
      event instanceof PopStateEvent &&
      event.initPopStateEvent
    ) {
      event.initPopStateEvent(details.type, details.bubbles, details.cancelable,
        details.state);
    } else {
      event.initEvent(details.type, details.bubbles, details.cancelable);
      event.state = JSON.parse(JSON.stringify(details.state));
    }

    event._reanimator = {
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
      details.view, details.detail);

    event._reanimator = {
      toFix: ['timeStamp']
    };

    return event;
  },

  FocusEvent: function (details) {
    var event = createEvent('FocusEvent');

    if (window.FocusEvent && event instanceof FocusEvent) {
      event.initFocusEvent(details.type, details.bubbles, details.cancelable,
        details.view, details.detail,
        details.relatedTarget);
    } else {
      event.initEvent(details.type, details.bubbles, details.cancelable);
      event.view = details.view;
      event.detail = JSON.parse(JSON.stringify(details.detail));
      event.relatedTarget = details.relatedTarget;
    }

    event._reanimator = {
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
      details.button, details.relatedTarget);

    event._reanimator = {
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

    event._reanimator = {
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

Reanimator.util = Reanimator.util || {};
Reanimator.util.event = Reanimator.util.event || {};

Reanimator.util.event.create = function createEvent(type, details) {
  var creator = eventCreators[type];
  
  if (!creator) {
    throw 'No event creator for DOM event of type "' + type + '"';
  }

  return creator(details);
};

module.exports = Reanimator.util.event.create;
