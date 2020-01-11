// test 1: sub-module
import Vue from 'vue/dist/vue.esm.browser.js';

// test 2: default export
import VueRouter from 'vue-router';

// test 3: named export
import {flatten} from 'array-flatten';
flatten([1, [2, [3, [4, [5], 6], 7], 8], 9]);

Vue.use(VueRouter);

// test 4: dynamic export
import('http-vue-loader/src/httpVueLoader.js').then(httpVueLoader => {
  Vue.use(httpVueLoader);

  new Vue({
    el: '#app',
    components: {
      app: 'url:./components/app.vue',
    },
    template: '<app></app>',
  });
});
