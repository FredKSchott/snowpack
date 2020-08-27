// test 1: sub-module
import Vue from 'vue/dist/vue.esm.browser.js';

// test 1b: relative paths, even those containing web_modules, are not scanned
import isPropValid from '/web_modules/@emotion/is-prop-valid.js';