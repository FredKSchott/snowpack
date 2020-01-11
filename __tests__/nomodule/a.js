// test 1: sub-module
import Vue from '/web_modules/vue/dist/vue.esm.browser.js';

// test 2: default export
import VueRouter from '/web_modules/vue-router.js';

import './b.js';
import './c.js';

Vue.use(VueRouter);

var app = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue',
  },
});
