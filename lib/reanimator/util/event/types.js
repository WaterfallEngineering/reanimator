var lenEvent = 'Event'.length;
var lenEvents = 'Events'.length;
var eventTypes = [];
var index;

for (var k in window) {
  if (k === 'Event') {
    // everything is an instanceof Event, so skip it so we can check it last
    continue;
  }

  index = k.indexOf('Event');
  if (index >= 0 &&
      k[0].match(/[A-Z]/) &&
      (index === k.length - lenEvent || index === k.length - lenEvents)
  ) {
    eventTypes.push(k);
  }
}

eventTypes.push('Event');

function getType(ev) {
  var i = 0;
  var type;

  // check all event types (looking at Event last)
  do {
    type = eventTypes[i];
    i++;
  } while (!(ev instanceof window[type]));

  return type;
}

module.exports = {
  types: eventTypes.slice(),
  getType: getType
};
