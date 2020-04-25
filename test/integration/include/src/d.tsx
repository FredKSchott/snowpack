// test 4: dynamic export
import(`bad:${'template'}-string`);

const badVariable = 'bad:cant-scan-a-variable';
import(badVariable);

import('/web_modules/http-vue-loader/src/httpVueLoader.js').then((httpVueLoader) => {
  Vue.use(httpVueLoader);

  new Vue({
    el: '#app',
    components: {
      app: 'url:./components/app.vue',
    },
    template: '<app></app>',
  });
});

interface Foo {
  a: string;
}
export const testComponent: any = <div>Hi</div>;
