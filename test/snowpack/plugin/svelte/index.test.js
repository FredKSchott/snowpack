const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('@snowpack/plugin-svelte', async () => {
    const result = await testFixture(
      {
        plugins: [['@snowpack/plugin-svelte']],
      },
      {
        'index.svelte': dedent`
          <style>
            div {
              color: red;
            }
          </style>
          <script>
            import Icon from 'svelte-awesome';
            import { refresh, comment, camera } from 'svelte-awesome/icons';
          </script>
          
          <Icon data={refresh}/>
          <div>Hello, test!</div>
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-plugin-build-svelte",
            "dependencies": {
              "svelte-awesome": "^2.3.0"
            }
          }
        `,
      },
    );

    expect(result['index.svelte.css.proxy.js']).toBeDefined();
    expect(result['index.svelte.js']).toContain(`import './index.svelte.css.proxy.js';`);
    expect(result['index.svelte.js']).toContain(
      `import { refresh, comment, camera } from "./_snowpack/pkg/svelte-awesome/icons.js";`,
    );
  });
});
