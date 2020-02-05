/*!
{
  "author": "Graham Fairweather",
  "copywrite": "Copyright (c) 2017-present",
  "date": "2019-08-28T16:29:45.680Z",
  "describe": "",
  "description": "Constructors cached from literals.",
  "file": "cached-constructors-x.js",
  "hash": "93d451540fea6f751712",
  "license": "MIT",
  "version": "2.2.1"
}
*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["cachedConstructorsX"] = factory();
	else
		root["cachedConstructorsX"] = factory();
})((function () {
  'use strict';

  var ObjectCtr = {}.constructor;
  var objectPrototype = ObjectCtr.prototype;
  var defineProperty = ObjectCtr.defineProperty;
  var $globalThis;
  var getGlobalFallback = function() {
    if (typeof self !== 'undefined') {
      return self;
    }

    if (typeof window !== 'undefined') {
      return window;
    }

    if (typeof global !== 'undefined') {
      return global;
    }

    return void 0;
  };

  var returnThis = function() {
    return this;
  };

  try {
    if (defineProperty) {
      defineProperty(objectPrototype, '$$globalThis$$', {
        get: returnThis,
        configurable: true
      });
    } else {
      objectPrototype.__defineGetter__('$$globalThis$$', returnThis);
    }

    $globalThis = typeof $$globalThis$$ === 'undefined' ? getGlobalFallback() : $$globalThis$$;

    delete objectPrototype.$$globalThis$$;

    return $globalThis;
  } catch (error) {
    return getGlobalFallback();
  }
}()), function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// CONCATENATED MODULE: ./node_modules/noop-x/dist/noop-x.esm.js
/**
 * This method returns undefined.
 *
 * @returns {undefined} Always undefined.
 */
var noop = function noop() {};
/* eslint-disable-line lodash/prefer-noop */


/* harmony default export */ var noop_x_esm = (noop);


// CONCATENATED MODULE: ./dist/cached-constructors-x.esm.js
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ArrayCtr", function() { return ArrayCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ArrayPrototype", function() { return ArrayPrototype; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BooleanCtr", function() { return BooleanCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BooleanPrototype", function() { return BooleanPrototype; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FunctionCtr", function() { return FunctionCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FunctionPrototype", function() { return FunctionPrototype; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NumberCtr", function() { return NumberCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NumberPrototype", function() { return NumberPrototype; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ObjectCtr", function() { return ObjectCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ObjectPrototype", function() { return ObjectPrototype; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RegExpCtr", function() { return RegExpCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RegExpPrototype", function() { return RegExpPrototype; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StringCtr", function() { return StringCtr; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "StringPrototype", function() { return StringPrototype; });

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

var FunctionCtr = noop_x_esm.constructor;
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



/***/ })
/******/ ]);
});
//# sourceMappingURL=cached-constructors-x.js.map