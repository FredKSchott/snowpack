import Vue from 'vue/dist/vue.esm.browser.js';

// test 5: dynamic export
import('http-vue-loader/src/httpVueLoader.js').then(httpVueLoader => {
  new Vue({
    el: '#app',
    components: {
      app: 'url:./components/app.vue',
    },
    template: '<app></app>',
  });
});
