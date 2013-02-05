/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');
var serialization = require('../util/event/serialization');
var create = require('../util/event/create');
var synthetic = require('../util/event/synthetic');
var iface = getInterface();

var _native, _log, xhrs, handlers;

function onReadyStateChange(event) {
  // Only log the event if someone is listening, it is not synthetic, and it
  // hasn't been logged yet.
  // - If no one is listening, getListeners() will return an empty array
  // - Events from `document.createEvent` will have `_reanimator.synthetic`
  //   set to `true`
  // - Events that have already been captured will have `_reanimator.captured`
  //   set to `true`
  var listenerCount = synthetic.EventTarget.
      getListeners(this, 'readystatechange', false).length +
    synthetic.EventTarget.getListeners(this, 'readystatechange', true);
  var entry;

  if (listenerCount > 0 && event && (
      !event._reanimator ||
      (!event._reanimator.captured && !event._reanimator.synthetic)
    )
  ) {
    event._reanimator = event._reanimator || {};
    event._reanimator.captured = true;

    entry = {
        type: 'xhr',
        time: _native.Date.now(),
        details: {
          id: this._reanimator.id,
          type: 'Event',
          details: serialization.serialize(event)
        }
    };

    entry.details.details.target = this._reanimator.id;
    entry.details.details.currentTarget = this._reanimator.id;
    entry.details.details.srcElement = this._reanimator.id;

    _log.events.push(entry);

    // re-raise the event
    var fakeEvent = new synthetic.Event();
    fakeEvent.initEvent(event.type, event.bubbles, event.cancelable);

    for (var k in event) {
      if (!(k in fakeEvent)) {
        fakeEvent[k] = event[k];
      }
    }

    fakeEvent._reanimator = event._reanimator;
    fakeEvent._timeStamp = event.timeStamp;

    this.dispatchEvent(fakeEvent);
  }
}

function linkProperty(name) {
  Object.defineProperty(this, name, {
    get: function () {
      var result;

      _log.xhr.instances[this._reanimator.id][name] =
        _log.xhr.instances[this._reanimator.id][name] || [];
      try {
        result = this._value[name];
        _log.xhr.instances[this._reanimator.id][name].push({
          type: 'result',
          value: result
        });

        return result;
      } catch (e) {
        _log.xhr.instances[this._reanimator.id][name].push({
          type: 'error',
          value: {
            message: e.message,
            code: e.code,
            name: e.name
          }
        });
        throw e;
      }
    },
    set: function (value) {
      this._value[name] = value;
    }
  });
}

function XMLHttpRequest_capture() {
  synthetic.EventTarget.call(this);

  this._value = new _native.XMLHttpRequest();
  this._reanimator = {
    id: _log.xhr.instances.length
  };
  var instance = { id: this._reanimator.id };
  _log.xhr.instances.push(instance);
  // XXX: not sure we need this here
  xhrs.push(this);

  this._value.
    addEventListener('readystatechange', onReadyStateChange.bind(this), false);

  // link properties
  iface.instance.properties.filter(function (name) {
    return name.indexOf('on') !== 0;
  }).forEach(linkProperty, this);

  // link methods
  iface.instance.methods.forEach(function (name) {
    this[name] = getMethodWrapper(name);
  }, this);
}

XMLHttpRequest_capture.prototype =
  Object.create(synthetic.EventTarget.prototype, {
  });

iface.prototype.methods.forEach(function (name) {
  if (!(name in synthetic.EventTarget.prototype)) {
    XMLHttpRequest_capture.prototype[name] = getMethodWrapper(name);
  }
});

iface.prototype.properties.forEach(function (name) {
  XMLHttpRequest_capture.prototype[name] = XMLHttpRequest[name];
});

function getMethodWrapper(name) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var result;

    _log.xhr.instances[this._reanimator.id][name] =
      _log.xhr.instances[this._reanimator.id][name] || [];

    try {
      result = this._value[name].apply(this._value, args);
      _log.xhr.instances[this._reanimator.id][name].push({
        type: 'result',
        value: result
      });

      return result;
    } catch (e) {
      _log.xhr.instances[this._reanimator.id][name].push({
        type: 'error',
        value: {
          message: e.message,
          code: e.code,
          name: e.name
        }
      });
      throw e;
    }
  };
}

['DONE', 'HEADERS_RECEIVED', 'LOADING', 'OPENED', 'SENT'].forEach(function (k) {
  XMLHttpRequest_capture[k] = window.XMLHttpRequest[k];
});

var statusDescriptor = {
    get: function () {
      this._assertReadyState(
        XMLHttpRequest.UNSENT, XMLHttpRequest.HEADERS_RECEIVED);
      return this._status;
    }
  };
var statusTextDescriptor = {
    get: function () {
      this._assertReadyState(
        XMLHttpRequest.UNSENT, XMLHttpRequest.HEADERS_RECEIVED);
      return this._statusText;
    }
  };

function XMLHttpRequest_replay() {
  this._reanimator = _log.xhr.instances.pop();
  Object.keys(this._reanimator).forEach(function (k) {
    if (this._reanimator[k] instanceof Array) {
      this._reanimator[k] = this._reanimator[k].reverse();
    }
  }, this);
  xhrs.push(this);

  // link properties
  _log.xhr.iface.instance.properties.forEach(function (name) {
    if (name.indexOf('on') === 0) {
      name = name.slice(2);
      Object.defineProperty(this, '_on' + name, {
        enumerable: false,
        value: null
      });
      Object.defineProperty(this, 'on' + name, {
        enumerable: true,
        get: function () {
          return this['_on' + name];
        },
        set: function (fn) {
          if (this['_on' + name]) {
            this.removeEventListener(name, this['_on' + name]);
            this['_on' + name] = null;
          }

          if (typeof fn === 'function') {
            this.addEventListener(name, fn);
            this['_on' + name] = fn;
          }
        }
      });
      return;
    } else {
      Object.defineProperty(this, name, {
        enumerable: true,
        get: function () {
          var result = this._reanimator[name].pop();
          var error;

          if (result.type === 'error') {
            error = new Error(result.value.message);
            error.code = result.value.code;
            error.name = result.value.name;
            throw error;
          }
          
          return result.value;
        },
        set: function (value) {
          /* NOP */
        }
      });
    }
  }, this);

  // link methods
  _log.xhr.iface.instance.methods.forEach(function (name) {
    this[name] = replayMethodOrProperty.bind(this, name);
  }, this);
}

['DONE', 'HEADERS_RECEIVED', 'LOADING', 'OPENED', 'SENT'].forEach(function (k) {
  XMLHttpRequest_replay[k] = window.XMLHttpRequest[k];
});

function replayMethodOrProperty(name) {
  var result = this._reanimator[name].pop();
  var error;

  if (result.type === 'error') {
    error = new Error(result.value.message);
    error.code = result.value.code;
    error.name = result.value.name;
    throw error;
  }
  
  return result.value;
}

function getInterface() {
  var iface = {
    instance: {
      methods: [],
      properties: []
    },
    prototype: {
      methods: [],
      properties: []
    }
  };
  var xhr = new XMLHttpRequest();
  var k;

  iface.instance.properties = Object.keys(xhr).filter(function (k) {
    if (typeof xhr[k] === 'function') {
      iface.instance.methods.push(k);
      return false;
    }

    return true;
  });

  iface.prototype.properties =
    Object.keys(xhr.constructor.prototype).filter(function (k) {
      if (typeof xhr.constructor.prototype[k] === 'function') {
        iface.prototype.methods.push(k);
        return false;
      }

      return true;
    });

  return iface;
}

Reanimator.plug('xhr', {
  init: function init(native) {
    _native = native;
    _native.XMLHttpRequest = window.XMLHttpRequest;
  },
  capture: function xhr_capture(log, config) {
    _log = log;

    _log.xhr = {
      iface: iface,
      instances: []
    };

    window.XMLHttpRequest = XMLHttpRequest_capture;
    handlers = {};
    xhrs = [];
  },
  beforeReplay: function (log, config) {
    window._log = _log = log;
    _log.xhr = _log.xhr || {
      iface: iface,
      instances: []
    };
    _log.xhr.instances = (_log.xhr.instances || []).slice().reverse();
    var prototype = {};

    _log.xhr.iface.prototype.methods.forEach(function (name) {
      if (!(name in synthetic.EventTarget.prototype)) {
        prototype[name] = function replayMethodOrProperty() {
          var result = this._reanimator[name].pop();
          var error;

          if (result.type === 'error') {
            error = new Error(result.value.message);
            error.code = result.value.code;
            error.name = result.value.name;
            throw error;
          }

          return result.value;
        };
      }
    });

    _log.xhr.iface.prototype.properties.forEach(function (name) {
      prototype[name] = XMLHttpRequest[name];
    });

    window.XMLHttpRequest = XMLHttpRequest_replay;
    XMLHttpRequest_replay.prototype =
      Object.create(synthetic.EventTarget.prototype, {});

    for (var k in prototype) {
      XMLHttpRequest_replay.prototype[k] = prototype[k];
    }

    handlers = {};
    xhrs = [];
  },
  replay: function (entry) {
    var xhr = xhrs[entry.details.id];
    var details = entry.details.details;

    var event = new synthetic.Event();
    event.initEvent(details.type, details.bubbles, details.cancelable);

    for (var k in details) {
      if (!(k in event)) {
        event[k] = details[k];
      }
    }
    event._timestamp = details.timestamp;
    event._reanimator = details._reanimator;
    event.entry = entry;
    event.srcElement = xhr;

    xhr.dispatchEvent(event);
  },
  cleanUp: function xhr_cleanUp() {
      window.XMLHttpRequest = _native.XMLHttpRequest;
  }
});
