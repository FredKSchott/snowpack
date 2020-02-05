(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  Object.defineProperty(exports, "__esModule", { value: true });
  var isProduction = process.env.NODE_ENV === 'production';
  var prefix = 'Invariant failed';
  function invariant(condition, message) {
      if (condition) {
          return;
      }
      if (isProduction) {
          throw new Error(prefix);
      }
      throw new Error(prefix + ": " + (message || ''));
  }
  exports.default = invariant;

})));
