const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  // TODO: Test runs and outputs as expected but doesn't
  // wait for the built asset before returning result
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
