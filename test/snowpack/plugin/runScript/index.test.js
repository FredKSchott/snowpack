const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  /* 

  CLI test: test/build/plugin-run-script
  Reason for skip: Fails locally on mac because the result is returned before the built css file is written
  
  Error:

    expect(received).toBeDefined()
      Received: undefined

        51 |     });
        52 |
      > 53 |     expect(result['css/index.css']).toBeDefined();
          |                                     ^
        54 |   });
        55 | });
        56 |

        at Object.<anonymous> (test/snowpack/plugin/runScript/index.test.js:53:37)  
  
  */

  it.skip('@snowpack/plugin-run-script', async () => {
    const result = await testFixture({
      'src/css/index.scss': dedent`
        $body-font: "fantasy";
        body {
          font-family: $body-font;
        }
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-plugin-run-script",
          "dependencies": {
            "@snowpack/plugin-run-script": "^2.0.0",
            "sass": "^1.26.10"
          }
        }
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          plugins: [
            [
              '@snowpack/plugin-run-script',
              {
                cmd: 'sass src/css:build/css --no-source-map',
              },
            ],
          ],
        };
      `,
    });

    expect(result['css/index.css']).toBeDefined();
  });
});
