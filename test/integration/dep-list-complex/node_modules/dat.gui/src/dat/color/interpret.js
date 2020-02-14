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

import toString from './toString';
import common from '../utils/common';

const INTERPRETATIONS = [
  // Strings
  {
    litmus: common.isString,
    conversions: {
      THREE_CHAR_HEX: {
        read: function(original) {
          const test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
          if (test === null) {
            return false;
          }

          return {
            space: 'HEX',
            hex: parseInt(
              '0x' +
              test[1].toString() + test[1].toString() +
              test[2].toString() + test[2].toString() +
              test[3].toString() + test[3].toString(), 0)
          };
        },

        write: toString
      },

      SIX_CHAR_HEX: {
        read: function(original) {
          const test = original.match(/^#([A-F0-9]{6})$/i);
          if (test === null) {
            return false;
          }

          return {
            space: 'HEX',
            hex: parseInt('0x' + test[1].toString(), 0)
          };
        },

        write: toString
      },

      CSS_RGB: {
        read: function(original) {
          const test = original.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
          if (test === null) {
            return false;
          }

          return {
            space: 'RGB',
            r: parseFloat(test[1]),
            g: parseFloat(test[2]),
            b: parseFloat(test[3])
          };
        },

        write: toString
      },

      CSS_RGBA: {
        read: function(original) {
          const test = original.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
          if (test === null) {
            return false;
          }

          return {
            space: 'RGB',
            r: parseFloat(test[1]),
            g: parseFloat(test[2]),
            b: parseFloat(test[3]),
            a: parseFloat(test[4])
          };
        },

        write: toString
      }
    }
  },

  // Numbers
  {
    litmus: common.isNumber,

    conversions: {

      HEX: {
        read: function(original) {
          return {
            space: 'HEX',
            hex: original,
            conversionName: 'HEX'
          };
        },

        write: function(color) {
          return color.hex;
        }
      }

    }

  },

  // Arrays
  {
    litmus: common.isArray,
    conversions: {
      RGB_ARRAY: {
        read: function(original) {
          if (original.length !== 3) {
            return false;
          }

          return {
            space: 'RGB',
            r: original[0],
            g: original[1],
            b: original[2]
          };
        },

        write: function(color) {
          return [color.r, color.g, color.b];
        }
      },

      RGBA_ARRAY: {
        read: function(original) {
          if (original.length !== 4) return false;
          return {
            space: 'RGB',
            r: original[0],
            g: original[1],
            b: original[2],
            a: original[3]
          };
        },

        write: function(color) {
          return [color.r, color.g, color.b, color.a];
        }
      }
    }
  },

  // Objects
  {
    litmus: common.isObject,
    conversions: {

      RGBA_OBJ: {
        read: function(original) {
          if (common.isNumber(original.r) &&
            common.isNumber(original.g) &&
            common.isNumber(original.b) &&
            common.isNumber(original.a)) {
            return {
              space: 'RGB',
              r: original.r,
              g: original.g,
              b: original.b,
              a: original.a
            };
          }
          return false;
        },

        write: function(color) {
          return {
            r: color.r,
            g: color.g,
            b: color.b,
            a: color.a
          };
        }
      },

      RGB_OBJ: {
        read: function(original) {
          if (common.isNumber(original.r) &&
            common.isNumber(original.g) &&
            common.isNumber(original.b)) {
            return {
              space: 'RGB',
              r: original.r,
              g: original.g,
              b: original.b
            };
          }
          return false;
        },

        write: function(color) {
          return {
            r: color.r,
            g: color.g,
            b: color.b
          };
        }
      },

      HSVA_OBJ: {
        read: function(original) {
          if (common.isNumber(original.h) &&
            common.isNumber(original.s) &&
            common.isNumber(original.v) &&
            common.isNumber(original.a)) {
            return {
              space: 'HSV',
              h: original.h,
              s: original.s,
              v: original.v,
              a: original.a
            };
          }
          return false;
        },

        write: function(color) {
          return {
            h: color.h,
            s: color.s,
            v: color.v,
            a: color.a
          };
        }
      },

      HSV_OBJ: {
        read: function(original) {
          if (common.isNumber(original.h) &&
            common.isNumber(original.s) &&
            common.isNumber(original.v)) {
            return {
              space: 'HSV',
              h: original.h,
              s: original.s,
              v: original.v
            };
          }
          return false;
        },

        write: function(color) {
          return {
            h: color.h,
            s: color.s,
            v: color.v
          };
        }
      }
    }
  }
];

let result;
let toReturn;

const interpret = function() {
  toReturn = false;

  const original = arguments.length > 1 ? common.toArray(arguments) : arguments[0];
  common.each(INTERPRETATIONS, function(family) {
    if (family.litmus(original)) {
      common.each(family.conversions, function(conversion, conversionName) {
        result = conversion.read(original);

        if (toReturn === false && result !== false) {
          toReturn = result;
          result.conversionName = conversionName;
          result.conversion = conversion;
          return common.BREAK;
        }
      });

      return common.BREAK;
    }
  });

  return toReturn;
};

export default interpret;
