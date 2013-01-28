/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');

var replay = {};
var _native;


capture_documentCreateEvent = function (type) {
  var result = _native.documentCreateEvent.call(document, type);

  result._reanimator = {
    synthetic: true
  };

  return result;
};

Reanimator.plug('document-create-event', {
  init: function init(native) {
    _native = native;
    _native.documentCreateEvent = document.createEvent;
  },

  capture: function capture(log, config) {
    document.createEvent = capture_documentCreateEvent;
  },

  cleanUp: function () {
    document.createEvent = _native.documentCreateEvent;
  }
});
