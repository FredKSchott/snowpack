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

import interpret from './interpret';
import math from './math';
import colorToString from './toString';
import common from '../utils/common';

class Color {
  constructor() {
    this.__state = interpret.apply(this, arguments);

    if (this.__state === false) {
      throw new Error('Failed to interpret color arguments');
    }

    this.__state.a = this.__state.a || 1;
  }

  toString() {
    return colorToString(this);
  }

  toHexString() {
    return colorToString(this, true);
  }

  toOriginal() {
    return this.__state.conversion.write(this);
  }
}

function defineRGBComponent(target, component, componentHexIndex) {
  Object.defineProperty(target, component, {
    get: function() {
      if (this.__state.space === 'RGB') {
        return this.__state[component];
      }

      Color.recalculateRGB(this, component, componentHexIndex);

      return this.__state[component];
    },

    set: function(v) {
      if (this.__state.space !== 'RGB') {
        Color.recalculateRGB(this, component, componentHexIndex);
        this.__state.space = 'RGB';
      }

      this.__state[component] = v;
    }
  });
}

function defineHSVComponent(target, component) {
  Object.defineProperty(target, component, {
    get: function() {
      if (this.__state.space === 'HSV') {
        return this.__state[component];
      }

      Color.recalculateHSV(this);

      return this.__state[component];
    },

    set: function(v) {
      if (this.__state.space !== 'HSV') {
        Color.recalculateHSV(this);
        this.__state.space = 'HSV';
      }

      this.__state[component] = v;
    }
  });
}


Color.recalculateRGB = function(color, component, componentHexIndex) {
  if (color.__state.space === 'HEX') {
    color.__state[component] = math.component_from_hex(color.__state.hex, componentHexIndex);
  } else if (color.__state.space === 'HSV') {
    common.extend(color.__state, math.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));
  } else {
    throw new Error('Corrupted color state');
  }
};

Color.recalculateHSV = function(color) {
  const result = math.rgb_to_hsv(color.r, color.g, color.b);

  common.extend(color.__state,
    {
      s: result.s,
      v: result.v
    }
  );

  if (!common.isNaN(result.h)) {
    color.__state.h = result.h;
  } else if (common.isUndefined(color.__state.h)) {
    color.__state.h = 0;
  }
};

Color.COMPONENTS = ['r', 'g', 'b', 'h', 's', 'v', 'hex', 'a'];

defineRGBComponent(Color.prototype, 'r', 2);
defineRGBComponent(Color.prototype, 'g', 1);
defineRGBComponent(Color.prototype, 'b', 0);

defineHSVComponent(Color.prototype, 'h');
defineHSVComponent(Color.prototype, 's');
defineHSVComponent(Color.prototype, 'v');

Object.defineProperty(Color.prototype, 'a', {
  get: function() {
    return this.__state.a;
  },

  set: function(v) {
    this.__state.a = v;
  }
});

Object.defineProperty(Color.prototype, 'hex', {
  get: function() {
    if (!this.__state.space !== 'HEX') {
      this.__state.hex = math.rgb_to_hex(this.r, this.g, this.b);
    }

    return this.__state.hex;
  },

  set: function(v) {
    this.__state.space = 'HEX';
    this.__state.hex = v;
  }
});

export default Color;
