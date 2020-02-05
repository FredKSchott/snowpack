import { n as noop } from './common/noop-x.esm-e72ec11e.js';

/**
 * Cached Array constructor.
 *
 * @class Array
 */

var ArrayCtr = [].constructor;
/**
 * Cached Array prototype.
 *
 * @type {!object}
 */

var ArrayPrototype = ArrayCtr.prototype;
/**
 * Cached Array constructor.
 *
 * @class Boolean
 */

var BooleanCtr = true.constructor;
/**
 * Cached Boolean prototype.
 *
 * @type {!object}
 */

var BooleanPrototype = BooleanCtr.prototype;
/**
 * Cached Function constructor.
 *
 * @class Function
 */

var FunctionCtr = noop.constructor;
/**
 * Cached Function prototype.
 *
 * @type {!object}
 */

var FunctionPrototype = FunctionCtr.prototype;
/**
 * Cached Number constructor.
 *
 * @class Number
 */

var NumberCtr = 0 .constructor;
/**
 * Cached Number prototype.
 *
 * @type {!object}
 */

var NumberPrototype = NumberCtr.prototype;
/**
 * Cached Object constructor.
 *
 * @class Object
 */

var ObjectCtr = {}.constructor;
/**
 * Cached Object prototype.
 *
 * @type {!object}
 */

var ObjectPrototype = ObjectCtr.prototype;
/**
 * Cached RegExp constructor.
 *
 * @class RegExp
 */

var RegExpCtr = /none/.constructor;
/**
 * Cached RegExp prototype.
 *
 * @type {!object}
 */

var RegExpPrototype = RegExpCtr.prototype;
/**
 * Cached String constructor.
 *
 * @class String
 */

var StringCtr = ''.constructor;
/**
 * Cached String prototype.
 *
 * @type {!object}
 */

var StringPrototype = StringCtr.prototype;

export { ArrayCtr, ArrayPrototype, BooleanCtr, BooleanPrototype, FunctionCtr, FunctionPrototype, NumberCtr, NumberPrototype, ObjectCtr, ObjectPrototype, RegExpCtr, RegExpPrototype, StringCtr, StringPrototype };
