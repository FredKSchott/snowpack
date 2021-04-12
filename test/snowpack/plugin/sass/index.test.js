const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('@snowpack/plugin-sass', async () => {
    const result = await testFixture(
      {
        plugins: [['@snowpack/plugin-sass']],
      },
      {
        '_partial.scss': dedent`
          body { color: blue; }
       `,
        'index.scss': dedent`
          @use "partial";
          html { background: red; }
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-plugin-sass",
            "devDependencies": {
              "@snowpack/plugin-sass": "^1.4.0"
            }
          }
        `,
      },
    );

    expect(result['index.css']).toBeDefined();
    // Includes partial contents
    expect(result['index.css']).toContain('color: blue;');
    // Includes index contents
    expect(result['index.css']).toContain('background: red;');
    // Does not include the partial file
    expect(result['_partial.css']).not.toBeDefined();
  });
});
