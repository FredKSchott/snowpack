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

let tmpComponent;

const ColorMath = {
  hsv_to_rgb: function(h, s, v) {
    const hi = Math.floor(h / 60) % 6;

    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1.0 - s);
    const q = v * (1.0 - (f * s));
    const t = v * (1.0 - ((1.0 - f) * s));

    const c = [
      [v, t, p],
      [q, v, p],
      [p, v, t],
      [p, q, v],
      [t, p, v],
      [v, p, q]
    ][hi];

    return {
      r: c[0] * 255,
      g: c[1] * 255,
      b: c[2] * 255
    };
  },

  rgb_to_hsv: function(r, g, b) {
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const delta = max - min;
    let h;
    let s;

    if (max !== 0) {
      s = delta / max;
    } else {
      return {
        h: NaN,
        s: 0,
        v: 0
      };
    }

    if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else {
      h = 4 + (r - g) / delta;
    }
    h /= 6;
    if (h < 0) {
      h += 1;
    }

    return {
      h: h * 360,
      s: s,
      v: max / 255
    };
  },

  rgb_to_hex: function(r, g, b) {
    let hex = this.hex_with_component(0, 2, r);
    hex = this.hex_with_component(hex, 1, g);
    hex = this.hex_with_component(hex, 0, b);
    return hex;
  },

  component_from_hex: function(hex, componentIndex) {
    return (hex >> (componentIndex * 8)) & 0xFF;
  },

  hex_with_component: function(hex, componentIndex, value) {
    return value << (tmpComponent = componentIndex * 8) | (hex & ~(0xFF << tmpComponent));
  }
};

export default ColorMath;
