const {testFixture} = require('../../../../fixture-utils');
const dedent = require('dedent');

describe('extends', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  /* 

  CLI test: test/build/config-extends-plugins
  Reason for skip: Fails locally on mac as the env file does not include secret value
  
  Error:

    expect(received).toContain(expected) // indexOf

      Expected substring: "export const SNOWPACK_PUBLIC_SECRET_VALUE = \"pumpernickel\";"
      Received string:    "export const MODE = \"test\";
      export const NODE_ENV = \"test\";
      export const SSR = false;"

        48 |     });
        49 |
      > 50 |     expect(result['_snowpack/env.js']).toContain(
          |                                        ^
        51 |       `export const SNOWPACK_PUBLIC_SECRET_VALUE = "pumpernickel";`,
        52 |     );
        53 |   });

        at Object.<anonymous> (test/snowpack/config/plugins/extends/index.test.js:50:40)
  
  */

  it('Loads plugin from extended config', async () => {
    const result = await testFixture({
      'base/package.json': dedent`
        {
          "private": true,
          "version": "1.0.0",
          "name": "@snowpack/test-config-extends-plugins-base",
          "devDependencies": {
            "@snowpack/plugin-dotenv": "^2.1.0"
          }
        } 
      `,
      'base/snowpack.config.json': dedent`
        {
          "plugins": [
            [
              "@snowpack/plugin-dotenv",
              {
                "dir": "%TEMP_TEST_DIRECTORY%"
              }
            ]
          ]
        }        
      `,
      'index.js': dedent`
        console.log(import.meta.env.SNOWPACK_PUBLIC_SECRET_VALUE);
      `,
      '.env': dedent`
        SNOWPACK_PUBLIC_SECRET_VALUE=pumpernickel
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          extends: './base/snowpack.config.json'
        };
      `,
    });

    expect(result['_snowpack/env.js']).toContain(
      `export const SNOWPACK_PUBLIC_SECRET_VALUE = "pumpernickel";`,
    );
  });
});
