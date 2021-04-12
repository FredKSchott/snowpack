const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('ts', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Typescript files are imported properly', async () => {
    const result = await testFixture(
      {},
      {
        'a.ts': dedent`  
          import Vue from 'vue/dist/vue.esm.browser.js';
          import VueRouter from 'vue-router';
          import type {Component} from 'vue';
                    
          interface TestInterface {
            [key: string]: string;
          }
          
          const testOptions: TestInterface = {};
          console.log(Vue, VueRouter);          
        `,
        'b.ts': dedent`
          import {flatten} from 'array-flatten';
          flatten([1, [2, [3, [4, [5], 6], 7], 8], 9]);
        `,
        'c.ts': dedent`
          import('http-vue-loader/src/httpVueLoader.js').then((httpVueLoader) => {
            new Vue({
              el: '#app',
              components: {
                app: 'url:./components/app.vue',
              },
              template: '<app></app>',
            });
          });
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-include-ts",
            "dependencies": {
              "array-flatten": "^3.0.0",
              "http-vue-loader": "^1.4.1",
              "shallow-equal": "^1.2.1",
              "vue": "^2.0.0",
              "vue-router": "^3.0.0"
            }
          }
        `,
      },
    );
    expect(result['a.js']).toBeDefined();
    expect(result['b.js']).toBeDefined();
    expect(result['c.js']).toBeDefined();
  });
});
