// test 1: sub-module
import Vue from 'vue/dist/vue.esm.browser.js';

// test 2: default export
import VueRouter from 'vue-router';

console.log(Vue, VueRouter);

// test 3: type import
import type {Component} from 'vue';

// test 4: standard TypeScript syntax

interface TestInterface {
  [key: string]: string;
}

const testOptions: TestInterface = {};
