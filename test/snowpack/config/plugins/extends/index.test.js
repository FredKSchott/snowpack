const {testFixture} = require('../../../../fixture-utils');
const dedent = require('dedent');

describe('extends', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  // Doesn't seem to inherit plugins
  it.skip('Loads and uses the appropriate plugins', async () => {
    const result = await testFixture(
      {
        extends: './base/snowpack.config.json',
        plugins: ['@snowpack/plugin-sass'],
      },
      {
        'base/package.json': dedent`
          {
            "private": true,
            "version": "1.0.0",
            "name": "@snowpack/test-config-extends-plugins-base",
            "devDependencies": {
              "@snowpack/plugin-dotenv": "^1.6.0-alpha.0"
            }
          } 
        `,
        'base/snowpack.config.json': dedent`
          {
            "plugins": ["@snowpack/plugin-dotenv"]
          }        
        `,
        'index.js': dedent`
          console.log(import.meta.env.SNOWPACK_PUBLIC_SECRET_VALUE);
        `,
        '.env': dedent`
          SNOWPACK_PUBLIC_SECRET_VALUE=pumpernickel
        `,
      },
    );

    expect(result['_snowpack/env.js']).toContain(
      `export const SNOWPACK_PUBLIC_SECRET_VALUE = "pumpernickel";`,
    );
  });
});
