/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import common from '../utils/common';

const EVENT_MAP = {
  HTMLEvents: ['change'],
  MouseEvents: ['click', 'mousemove', 'mousedown', 'mouseup', 'mouseover'],
  KeyboardEvents: ['keydown']
};

const EVENT_MAP_INV = {};
common.each(EVENT_MAP, function(v, k) {
  common.each(v, function(e) {
    EVENT_MAP_INV[e] = k;
  });
});

const CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;

function cssValueToPixels(val) {
  if (val === '0' || common.isUndefined(val)) {
    return 0;
  }

  const match = val.match(CSS_VALUE_PIXELS);

  if (!common.isNull(match)) {
    return parseFloat(match[1]);
  }

  // TODO ...ems? %?

  return 0;
}

/**
 * @namespace
 * @member dat.dom
 */
const dom = {

  /**
   *
   * @param elem
   * @param selectable
   */
  makeSelectable: function(elem, selectable) {
    if (elem === undefined || elem.style === undefined) return;

    elem.onselectstart = selectable ? function() {
      return false;
    } : function() {
    };

    elem.style.MozUserSelect = selectable ? 'auto' : 'none';
    elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
    elem.unselectable = selectable ? 'on' : 'off';
  },

  /**
   *
   * @param elem
   * @param horizontal
   * @param vert
   */
  makeFullscreen: function(elem, hor, vert) {
    let vertical = vert;
    let horizontal = hor;

    if (common.isUndefined(horizontal)) {
      horizontal = true;
    }

    if (common.isUndefined(vertical)) {
      vertical = true;
    }

    elem.style.position = 'absolute';

    if (horizontal) {
      elem.style.left = 0;
      elem.style.right = 0;
    }
    if (vertical) {
      elem.style.top = 0;
      elem.style.bottom = 0;
    }
  },

  /**
   *
   * @param elem
   * @param eventType
   * @param params
   */
  fakeEvent: function(elem, eventType, pars, aux) {
    const params = pars || {};
    const className = EVENT_MAP_INV[eventType];
    if (!className) {
      throw new Error('Event type ' + eventType + ' not supported.');
    }
    const evt = document.createEvent(className);
    switch (className) {
      case 'MouseEvents':
        {
          const clientX = params.x || params.clientX || 0;
          const clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false,
            params.cancelable || true, window, params.clickCount || 1,
            0, // screen X
            0, // screen Y
            clientX, // client X
            clientY, // client Y
            false, false, false, false, 0, null);
          break;
        }
      case 'KeyboardEvents':
        {
          const init = evt.initKeyboardEvent || evt.initKeyEvent; // webkit || moz
          common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false,
            params.cancelable, window,
            params.ctrlKey, params.altKey,
            params.shiftKey, params.metaKey,
            params.keyCode, params.charCode);
          break;
        }
      default:
        {
          evt.initEvent(eventType, params.bubbles || false, params.cancelable || true);
          break;
        }
    }
    common.defaults(evt, aux);
    elem.dispatchEvent(evt);
  },

  /**
   *
   * @param elem
   * @param event
   * @param func
   * @param bool
   */
  bind: function(elem, event, func, newBool) {
    const bool = newBool || false;
    if (elem.addEventListener) {
      elem.addEventListener(event, func, bool);
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, func);
    }
    return dom;
  },

  /**
   *
   * @param elem
   * @param event
   * @param func
   * @param bool
   */
  unbind: function(elem, event, func, newBool) {
    const bool = newBool || false;
    if (elem.removeEventListener) {
      elem.removeEventListener(event, func, bool);
    } else if (elem.detachEvent) {
      elem.detachEvent('on' + event, func);
    }
    return dom;
  },

  /**
   *
   * @param elem
   * @param className
   */
  addClass: function(elem, className) {
    if (elem.className === undefined) {
      elem.className = className;
    } else if (elem.className !== className) {
      const classes = elem.className.split(/ +/);
      if (classes.indexOf(className) === -1) {
        classes.push(className);
        elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
      }
    }
    return dom;
  },

  /**
   *
   * @param elem
   * @param className
   */
  removeClass: function(elem, className) {
    if (className) {
      if (elem.className === className) {
        elem.removeAttribute('class');
      } else {
        const classes = elem.className.split(/ +/);
        const index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          elem.className = classes.join(' ');
        }
      }
    } else {
      elem.className = undefined;
    }
    return dom;
  },

  hasClass: function(elem, className) {
    return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
  },

  /**
   *
   * @param elem
   */
  getWidth: function(elem) {
    const style = getComputedStyle(elem);

    return cssValueToPixels(style['border-left-width']) +
      cssValueToPixels(style['border-right-width']) +
      cssValueToPixels(style['padding-left']) +
      cssValueToPixels(style['padding-right']) +
      cssValueToPixels(style.width);
  },

  /**
   *
   * @param elem
   */
  getHeight: function(elem) {
    const style = getComputedStyle(elem);

    return cssValueToPixels(style['border-top-width']) +
      cssValueToPixels(style['border-bottom-width']) +
      cssValueToPixels(style['padding-top']) +
      cssValueToPixels(style['padding-bottom']) +
      cssValueToPixels(style.height);
  },

  /**
   *
   * @param el
   */
  getOffset: function(el) {
    let elem = el;
    const offset = { left: 0, top: 0 };
    if (elem.offsetParent) {
      do {
        offset.left += elem.offsetLeft;
        offset.top += elem.offsetTop;
        elem = elem.offsetParent;
      } while (elem);
    }
    return offset;
  },

  // http://stackoverflow.com/posts/2684561/revisions
  /**
   *
   * @param elem
   */
  isActive: function(elem) {
    return elem === document.activeElement && (elem.type || elem.href);
  }

};

export default dom;
