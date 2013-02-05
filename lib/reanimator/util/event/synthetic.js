/*jslint es5: true */
/**
 * Synthetic events for working around browsers that don't provide
 * XMLHttpRequestProgressEvent
 *
 * This module largely consists of portions of /lib/jsdom/level2/events.js from
 * jsdom, modified to pass jshint, use Object.create for inheritance, and adhere
 * to the Events Level 3 ordering.
 *
 * jsdom is made available under the MIT license:
 * Copyright (c) 2010 Elijah Insua
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
var Reanimator = require('../../core');
var events = {};

events.EventException = function() {
    if (arguments.length > 0) {
        this._code = arguments[0];
    } else {
        this._code = 0;
    }
    if (arguments.length > 1) {
        this._message = arguments[1];
    } else {
        this._message = "Unspecified event type";
    }
    Error.call(this, this._message);
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, events.EventException);
    }
};
events.EventException.prototype = Object.create(Error.prototype, {
    UNSPECIFIED_EVENT_TYPE_ERR : { value: 0 },
    code: { get: function code() { return this._code;} }
});

events.Event = function(eventType) {
    this._eventType = eventType;
    this._type = null;
    this._bubbles = null;
    this._cancelable = null;
    this._target = null;
    this._currentTarget = null;
    this._eventPhase = null;
    this._timeStamp = null;
    this._preventDefault = false;
    this._stopPropagation = false;
};
events.Event.prototype = {
    initEvent: function(type, bubbles, cancelable) {
        this._type = type;
        this._bubbles = bubbles;
        this._cancelable = cancelable;
    },
    preventDefault: function() {
        if (this._cancelable) {
            this._preventDefault = true;
        }
    },
    stopPropagation: function() {
        this._stopPropagation = true;
    },
    CAPTURING_PHASE : 1,
    AT_TARGET       : 2,
    BUBBLING_PHASE  : 3,
    get eventType() { return this._eventType; },
    get type() { return this._type; },
    get bubbles() { return this._bubbles; },
    get cancelable() { return this._cancelable; },
    get target() { return this._target; },
    get currentTarget() { return this._currentTarget; },
    get eventPhase() { return this._eventPhase; },
    get timeStamp() { return this._timeStamp; }
};


events.UIEvent = function(eventType) {
    events.Event.call(this, eventType);
    this.view = null;
    this.detail = null;
};
events.UIEvent.prototype = Object.create(events.Event.prototype, {
    initUIEvent: function(type, bubbles, cancelable, view, detail) {
        this.initEvent(type, bubbles, cancelable);
        this.view = view;
        this.detail = detail;
    },
});

events.MouseEvent = function(eventType) {
    events.UIEvent.call(this, eventType);
    this.screenX = null;
    this.screenY = null;
    this.clientX = null;
    this.clientY = null;
    this.ctrlKey = null;
    this.shiftKey = null;
    this.altKey = null;
    this.metaKey = null;
    this.button = null;
    this.relatedTarget = null;
};
events.MouseEvent.prototype = Object.create(events.UIEvent.prototype, {
    initMouseEvent: { value: function(type,
                               bubbles,
                               cancelable,
                               view,
                               detail,
                               screenX,
                               screenY,
                               clientX,
                               clientY,
                               ctrlKey,
                               altKey,
                               shiftKey,
                               metaKey,
                               button,
                               relatedTarget) {
            this.initUIEvent(type, bubbles, cancelable, view, detail);
            this.screenX  = screenX;
            this.screenY  = screenY;
            this.clientX  = clientX;
            this.clientY  = clientY;
            this.ctrlKey  = ctrlKey;
            this.shiftKey  = shiftKey;
            this.altKey  = altKey;
            this.metaKey  = metaKey;
            this.button  = button;
            this.relatedTarget  = relatedTarget;
        }
    }
});

events.MutationEvent = function(eventType) {
    events.Event.call(this, eventType);
    this.relatedNode = null;
    this.prevValue = null;
    this.newValue = null;
    this.attrName = null;
    this.attrChange = null;
};
events.MutationEvent.prototype = Object.create(events.Event.prototype, {
    initMutationEvent: { value: function(type,
                                  bubbles,
                                  cancelable,
                                  relatedNode,
                                  prevValue,
                                  newValue,
                                  attrName,
                                  attrChange) {
            this.initEvent(type, bubbles, cancelable);
            this.relatedNode = relatedNode;
            this.prevValue = prevValue;
            this.newValue = newValue;
            this.attrName = attrName;
            this.attrChange = attrChange;
        }
    },
    MODIFICATION : { value: 1 },
    ADDITION     : { value: 2 },
    REMOVAL      : { value: 3 }
});

events.EventTarget = function() {};

events.EventTarget.getListeners = function getListeners(target, type, capturing) {
    var listeners = target._listeners &&
        target._listeners[type] &&
        target._listeners[type][capturing] || [];
    if (!capturing) {
        var traditionalHandler = target['on' + type];
        if (traditionalHandler) {
            listeners.push(traditionalHandler);
        }
    }
    return listeners;
};

events.EventTarget.dispatch = function dispatch(event, iterator, capturing) {
    var listeners,
        currentListener,
        target = iterator();

    while (target && !event._stopPropagation) {
        listeners = events.EventTarget.getListeners(target, event._type, capturing);
        currentListener = 0;
        while (currentListener < listeners.length) {
            event._currentTarget = target;
            try {
              listeners[currentListener].call(target, event);
            } catch (e) {
              target.raise(
                'error', "Dispatching event '" + event._type + "' failed",
                {error: e, event: event}
              );
            }
            currentListener++;
        }
        target = iterator();
    }
    return !event._stopPropagation;
};

events.EventTarget.forwardIterator = function forwardIterator(list) {
  var i = 0, len = list.length;
  return function iterator() { return i < len ? list[i++] : null; };
};

events.EventTarget.backwardIterator = function backwardIterator(list) {
  var i = list.length;
  return function iterator() { return i >=0 ? list[--i] : null; };
};

events.EventTarget.singleIterator = function singleIterator(obj) {
  var i = 1;
  return function iterator() { return i-- ? obj : null; };
};

events.EventTarget.prototype = {
    addEventListener: function(type, listener, capturing) {
        this._listeners = this._listeners || {};
        var listeners = this._listeners[type] || {};
        capturing = (capturing === true);
        var capturingListeners = listeners[capturing] || [];
        for (var i=0; i < capturingListeners.length; i++) {
            if (capturingListeners[i] === listener) {
                return;
            }
        }
        capturingListeners.push(listener);
        listeners[capturing] = capturingListeners;
        this._listeners[type] = listeners;
    },

    removeEventListener: function(type, listener, capturing) {
        var listeners  = this._listeners && this._listeners[type];
        if (!listeners) return;
        var capturingListeners = listeners[(capturing === true)];
        if (!capturingListeners) return;
        for (var i=0; i < capturingListeners.length; i++) {
            if (capturingListeners[i] === listener) {
                capturingListeners.splice(i, 1);
                return;
            }
        }
    },

    dispatchEvent: function(event) {
        /*jshint eqnull: true, eqeqeq: false */
        if (event == null) {
            throw new events.EventException(0, "Null event");
        }
        if (event._type == null || event._type == "") {
            throw new events.EventException(0, "Uninitialized event");
        }

        var targetList = [];

        event._target = this;

        //per the spec we gather the list of targets first to ensure
        //against dom modifications during actual event dispatch
        var target = this,
            targetParent = target._parentNode;
        while (targetParent) {
            targetList.push(targetParent);
            target = targetParent;
            targetParent = target._parentNode;
        }
        targetParent = target._parentWindow;
        if (targetParent) {
            targetList.push(targetParent);
        }

        var iterator = events.EventTarget.backwardIterator(targetList);

        event._eventPhase = event.CAPTURING_PHASE;
        if (!events.EventTarget.dispatch(event, iterator, true)) return event._preventDefault;

        iterator = events.EventTarget.singleIterator(event._target);
        event._eventPhase = event.AT_TARGET;
        if (!events.EventTarget.dispatch(event, iterator, false)) return event._preventDefault;

        if (event._bubbles && !event._stopPropagation) {
            var i = 0;
            iterator = events.EventTarget.forwardIterator(targetList);
            event._eventPhase = event.BUBBLING_PHASE;
            events.EventTarget.dispatch(event, iterator, false);
        }

        return event._preventDefault;
    }

};

Reanimator.util = Reanimator.util || {};
Reanimator.util.event = Reanimator.util.event || {};

Reanimator.util.event.synthetic = module.exports = events;
