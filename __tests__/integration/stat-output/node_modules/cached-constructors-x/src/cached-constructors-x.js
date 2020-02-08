import noop from 'noop-x';

/**
 * Cached Array constructor.
 *
 * @class Array
 */
export const ArrayCtr = [].constructor;
/**
 * Cached Array prototype.
 *
 * @type {!object}
 */
export const ArrayPrototype = ArrayCtr.prototype;

/**
 * Cached Array constructor.
 *
 * @class Boolean
 */
export const BooleanCtr = true.constructor;
/**
 * Cached Boolean prototype.
 *
 * @type {!object}
 */
export const BooleanPrototype = BooleanCtr.prototype;

/**
 * Cached Function constructor.
 *
 * @class Function
 */
export const FunctionCtr = noop.constructor;
/**
 * Cached Function prototype.
 *
 * @type {!object}
 */
export const FunctionPrototype = FunctionCtr.prototype;

/**
 * Cached Number constructor.
 *
 * @class Number
 */
export const NumberCtr = (0).constructor;
/**
 * Cached Number prototype.
 *
 * @type {!object}
 */
export const NumberPrototype = NumberCtr.prototype;

/**
 * Cached Object constructor.
 *
 * @class Object
 */
export const ObjectCtr = {}.constructor;
/**
 * Cached Object prototype.
 *
 * @type {!object}
 */
export const ObjectPrototype = ObjectCtr.prototype;

/**
 * Cached RegExp constructor.
 *
 * @class RegExp
 */
export const RegExpCtr = /none/.constructor;
/**
 * Cached RegExp prototype.
 *
 * @type {!object}
 */
export const RegExpPrototype = RegExpCtr.prototype;

/**
 * Cached String constructor.
 *
 * @class String
 */
export const StringCtr = ''.constructor;
/**
 * Cached String prototype.
 *
 * @type {!object}
 */
export const StringPrototype = StringCtr.prototype;
