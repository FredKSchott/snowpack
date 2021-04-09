const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('package', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Loads tippy module correctly', async () => {
    const result = await testFixture(
      {},
      {
        'index.js': dedent`
          import 'tippy.js/dist/tippy.css';
          import tippy from 'tippy.js';
          import * as tippyJs from 'tippy.js/headless/dist/tippy-headless.esm.js';
          
          console.log(tippyJs);
          
          tippy('#myButton', {
            content: "I'm a Tippy tooltip!",
          }); 
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-package-tippy-js",
            "dependencies": {
              "tippy.js": "^6.2.5"
            }
          }
        `,
      },
    );

    // Files were created in the correct location
    expect(result['_snowpack/pkg/tippyjs/dist/tippy.css']).toBeDefined();
    expect(result['_snowpack/pkg/tippyjs/dist/tippy.css.proxy.js']).toBeDefined();
    expect(result['_snowpack/pkg/tippyjs/headless/dist/tippy-headless.esm.js']).toBeDefined();
    // Files were imported from the correct location
    expect(result['index.js']).toContain(
      `import './_snowpack/pkg/tippyjs/dist/tippy.css.proxy.js';`,
    );
    expect(result['index.js']).toContain(`import tippy from './_snowpack/pkg/tippyjs.js';`);
    expect(result['index.js']).toContain(
      `import * as tippyJs from './_snowpack/pkg/tippyjs/headless/dist/tippy-headless.esm.js';`,
    );
  });
});
