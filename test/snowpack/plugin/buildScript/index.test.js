const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('@snowpack/plugin-build-script', async () => {
    const result = await testFixture({
      'index.ts': dedent`
        type stringType = string;
        const msg: stringType = 'I’m a TypeScript file';
        console.log(msg);
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-plugin-build-script",
          "dependencies": {
            "@babel/cli": "^7.13.14",
            "@babel/core": "^7.13.15",
            "@babel/preset-typescript": "^7.10.4",
            "@snowpack/plugin-build-script": "^2.0.0",
            "snowpack": "^3.3.0"
          }
        }
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          plugins: [
            [
              '@snowpack/plugin-build-script',
              {
                input: ['.ts'],
                output: ['.js'],
                cmd: 'babel --filename $FILE --presets @babel/preset-typescript',
              },
            ],
          ],
        };
      `,
    });

    expect(result['index.js']).toBeDefined();
    expect(result['index.ts']).not.toBeDefined();
  });
});
