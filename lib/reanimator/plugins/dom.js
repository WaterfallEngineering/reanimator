/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');
var serialization = require('../util/event/serialization');
var create = require('../util/event/create');

var _native, _log;

// FIXME: should be broken out to a separate module

function dom_replay(entry) {
  var relatedTarget = entry.details.details.relatedTarget;
  entry.details.details.relatedTarget =
    serialization.traverseToElement(entry.details.details.relatedTarget);
  var event = create(entry.details.type, entry.details.details);
  entry.details.details.relatedTarget = relatedTarget;

  event._reanimator.entry = entry;

  serialization.
    traverseToElement(entry.details.details.target).dispatchEvent(event);
}

Reanimator.plug('dom', {
  init: function init(native) {
    _native = native;
  },
  capture: function (log, config) {
    /* NOP */
  },
  beforeReplay: function (log, config) {
    /* NOP */
  },
  replay: dom_replay,
  cleanUp: function jquery_cleanUp() { }
});
