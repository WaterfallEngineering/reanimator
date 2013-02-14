/* vim: set et ts=2 sts=2 sw=2: */
var Reanimator = require('../core');
var serialization = require('../util/event/serialization');
var create = require('../util/event/create');

var _native, _log;

// FIXME: should be broken out to a separate module

function dom_replay(entry) {
  var details = entry.details.details;
  var relatedTarget = details.relatedTarget;
  // set related target in entry before creation or creating the event will fail
  details.relatedTarget =
    serialization.traverseToElement(details.relatedTarget);

  var event = create(entry.details.type, entry.details.details);
  // restore related target in entry
  details.relatedTarget = relatedTarget;

  event._reanimator.entry = entry;
  var target = serialization.traverseToElement(details.target);
  target.value = details._reanimator.value;
  target.dispatchEvent(event);
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
