const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('packageOptions.source', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Loads modules into cache when source is remote-next', async () => {
    const result = await testFixture({
      'index.js': dedent`
        import { flatten } from "array-flatten";
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-package-source-remote-next",
          "dependencies": {
            "array-flatten": "^3.0.0"
          }
        }
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          packageOptions: {
            source: 'remote-next',
          },
        };
      `,
    });
    expect(result['../.snowpack/source/package.json']).toBeDefined();
    expect(result['../.snowpack/source/package-lock.json']).toBeDefined();
    expect(result['../.snowpack/source/node_modules/array-flatten/package.json']).toBeDefined();
  });
});
