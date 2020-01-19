// test 4: dynamic export
import('/web_modules/http-vue-loader/src/httpVueLoader.js').then(httpVueLoader => {
  Vue.use(httpVueLoader);

  new Vue({
    el: '#app',
    components: {
      app: 'url:./components/app.vue',
    },
    template: '<app></app>',
  });
});
