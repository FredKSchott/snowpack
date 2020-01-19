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

import Controller from './Controller';
import common from '../utils/common';

function numDecimals(x) {
  const _x = x.toString();
  if (_x.indexOf('.') > -1) {
    return _x.length - _x.indexOf('.') - 1;
  }

  return 0;
}

/**
 * @class Represents a given property of an object that is a number.
 *
 * @extends dat.controllers.Controller
 *
 * @param {Object} object The object to be manipulated
 * @param {string} property The name of the property to be manipulated
 * @param {Object} [params] Optional parameters
 * @param {Number} [params.min] Minimum allowed value
 * @param {Number} [params.max] Maximum allowed value
 * @param {Number} [params.step] Increment by which to change value
 */
class NumberController extends Controller {
  constructor(object, property, params) {
    super(object, property);

    const _params = params || {};

    this.__min = _params.min;
    this.__max = _params.max;
    this.__step = _params.step;

    if (common.isUndefined(this.__step)) {
      if (this.initialValue === 0) {
        this.__impliedStep = 1; // What are we, psychics?
      } else {
        // Hey Doug, check this out.
        this.__impliedStep = Math.pow(10, Math.floor(Math.log(Math.abs(this.initialValue)) / Math.LN10)) / 10;
      }
    } else {
      this.__impliedStep = this.__step;
    }

    this.__precision = numDecimals(this.__impliedStep);
  }

  setValue(v) {
    let _v = v;

    if (this.__min !== undefined && _v < this.__min) {
      _v = this.__min;
    } else if (this.__max !== undefined && _v > this.__max) {
      _v = this.__max;
    }

    if (this.__step !== undefined && _v % this.__step !== 0) {
      _v = Math.round(_v / this.__step) * this.__step;
    }

    return super.setValue(_v);
  }

  /**
   * Specify a minimum value for <code>object[property]</code>.
   *
   * @param {Number} minValue The minimum value for
   * <code>object[property]</code>
   * @returns {dat.controllers.NumberController} this
   */
  min(minValue) {
    this.__min = minValue;
    return this;
  }

  /**
   * Specify a maximum value for <code>object[property]</code>.
   *
   * @param {Number} maxValue The maximum value for
   * <code>object[property]</code>
   * @returns {dat.controllers.NumberController} this
   */
  max(maxValue) {
    this.__max = maxValue;
    return this;
  }

  /**
   * Specify a step value that dat.controllers.NumberController
   * increments by.
   *
   * @param {Number} stepValue The step value for
   * dat.controllers.NumberController
   * @default if minimum and maximum specified increment is 1% of the
   * difference otherwise stepValue is 1
   * @returns {dat.controllers.NumberController} this
   */
  step(stepValue) {
    this.__step = stepValue;
    this.__impliedStep = stepValue;
    this.__precision = numDecimals(stepValue);
    return this;
  }
}

export default NumberController;
