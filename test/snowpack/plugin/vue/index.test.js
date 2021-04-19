const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('@snowpack/plugin-vue', async () => {
    const result = await testFixture({
      'MyComponent.vue': dedent`
        <script>
          export default {
            props: {}
          }
        </script>
      `,
      'index.vue': dedent`
        <script>
          import MyComponent from './MyComponent';
          export default {
            components: { MyComponent }
          }
        </script>
      `,
      'package.json': dedent`
        {
          "version": "1.0.0",
          "name": "@snowpack/test-plugin-vue",
          "devDependencies": {
            "@snowpack/plugin-vue": "^2.3.0"
          }
        }  
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          plugins: [['@snowpack/plugin-vue']],
        };
      `,
    });

    expect(result['MyComponent.vue.js']).toBeDefined();
    expect(result['index.vue.js']).toContain(`import MyComponent from './MyComponent.vue.js'`);
  });
});
