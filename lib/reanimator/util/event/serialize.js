/* vim: set et ts=2 sts=2 sw=2: */

(function (global) {
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

  function serialize(ev) {
    var result = {};

    for (var k in ev) {
      if (ev[k] === window) {
        continue;
      }

      // FIXME: doesn't handle window
      result[k] =
        ev[k] instanceof Element ? getTraversal(ev[k]) : ev[k];
    }

    return result;
  }

  Reanimator.util = Reanimator.util || {};
  Reanimator.util.event = Reanimator.util.event || {};
  Reanimator.util.event.serialize = serialize;
}(this));
