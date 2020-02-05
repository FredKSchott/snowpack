/*!
{
  "author": "Graham Fairweather",
  "copywrite": "Copyright (c) 2019-present",
  "date": "2019-08-28T16:29:05.336Z",
  "describe": "",
  "description": "Indicates if the engine has a working bind function.",
  "file": "has-working-bind-x.js",
  "hash": "55b02b7d0e6d359717dc",
  "license": "MIT",
  "version": "1.0.1"
}
*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["hasWorkingBindX"] = factory();
	else
		root["hasWorkingBindX"] = factory();
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


// CONCATENATED MODULE: ./dist/has-working-bind-x.esm.js

var bind = noop_x_esm.bind;

var test1 = function test1() {
  var a1 = null;
  var a2 = null;
  var context = null;
  var testThis = [];

  var test1Fn = function test1Fn(arg1, arg2) {
    /* eslint-disable-next-line babel/no-invalid-this */
    context = this;
    a1 = arg1;
    a2 = arg2;
    /* eslint-disable-next-line prefer-rest-params */

    return arguments;
  };

  try {
    var boundFn = bind.apply(test1Fn, [testThis, 1]);
    var args = boundFn(2);
    return boundFn.length === 1 && args.length === 2 && a1 === 1 && a2 === 2 && context === testThis;
  } catch (e) {
    return false;
  }
};

var test2 = function test2() {
  var a1 = null;
  var a2 = null;
  var context = null;
  var oracle = [1, 2, 3];

  var Ctr = function Ctr(arg1, arg2) {
    a1 = arg1;
    a2 = arg2;
    context = this;
    return oracle;
  };

  try {
    var BoundFn = bind.apply(Ctr, [null]);
    var returned = new BoundFn(1, 2);
    return BoundFn.length === Ctr.length && returned === oracle && a1 === 1 && a2 === 2 && context !== oracle;
  } catch (e) {
    return false;
  }
};
/**
 * Indicates if the engine has a working bind function.
 *
 * @type {boolean}
 */


var isWorking = typeof bind === 'function' && test1() && test2();
/* harmony default export */ var has_working_bind_x_esm = __webpack_exports__["default"] = (isWorking);



/***/ })
/******/ ]);
});
//# sourceMappingURL=has-working-bind-x.js.map