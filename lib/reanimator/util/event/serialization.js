/* vim: set et ts=2 sts=2 sw=2: */

function serialize(ev) {
  var result = {};
  var val;

  for (var k in ev) {
    val = ev[k];
    if (ev[k] === window) {
      result[k] = 'window';
    } else {
      result[k] = ev[k] instanceof Element || ev[k] === document ?
        getTraversal(ev[k]) : ev[k];
    }
  }

  return result;
}

function getTraversal(el) {
  var result = [];
  var parent;

  while (el !== document && el.parentNode) {
    parent = el.parentNode;

    if (el === document.head) {
      result.push('head');
      parent = document;
    } else if (el === document.body) {
      result.push('body');
      parent = document;
    } else {
      // find out index
      for (var i = 0; i < parent.childNodes.length; i++) {
        if (parent.childNodes[i] === el) {
          result.push(i);
          break;
        }
      }
    }
    el = parent;
  }

  return result;
}

function traverseToElement(traversal) {
  var el = document;
  var originalTraversal = traversal ? traversal.slice() : traversal;

  if (traversal === null) {
    return null;
  } else if (traversal === 'window') {
    return window;
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

Reanimator.util = Reanimator.util || {};
Reanimator.util.event = Reanimator.util.event || {};
Reanimator.util.event.serialization = {
  serialize: serialize,
  traverseToElement: traverseToElement
};

module.exports = Reanimator.util.event.serialization;
