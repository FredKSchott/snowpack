const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('withExtension', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Picks up a snowpack config with .cjs extension', async () => {
    const result = await testFixture(
      {},
      {
        'index.js': dedent`
          console.log(import.meta.env);
        `,
        'snowpack.config.cjs': dedent`
          module.exports = {
            buildOptions: {
              "out": "TEST_BUILD_OUT"
            }
          }
        `,
      },
      {absolute: true},
    );
    expect(Object.keys(result).every((x) => x.match('/TEST_BUILD_OUT/'))).toBeTruthy();
  });

  // Jest can't handle the module import here for some reason
  it.skip('Picks up a snowpack config inside of a "module" type package', async () => {
    const result = await testFixture(
      {},
      {
        'index.js': dedent`
          console.log(import.meta.env);
        `,
        'snowpack.config.js': dedent`
          export default {
            buildOptions: {
              out: 'TEST_BUILD_OUT',
            },
          };
        `,
        'package.json': dedent`
          {
            "name": "@snowpack/test-config-loading-esm-package",
            "version": "0.1.0",
            "type": "module"
          }
        `,
      },
      {absolute: true},
    );
    expect(Object.keys(result).every((x) => x.match('/TEST_BUILD_OUT/'))).toBeTruthy();
  });

  // Jest can't handle the module import here for some reason
  it.skip('Picks up a snowpack config with .mjs extension', async () => {
    const result = await testFixture(
      {},
      {
        'index.js': dedent`
          console.log(import.meta.env);
        `,
        'snowpack.config.mjs': dedent`
          export default {
            buildOptions: {
              out: "TEST_BUILD_OUT"
            }
          }
        `,
      },
      {absolute: true},
    );
    expect(Object.keys(result).every((x) => x.match('/TEST_BUILD_OUT/'))).toBeTruthy();
  });

  // Seems like loadConfiguration can't extract the snowpack options
  // when given a package.json path as the second argument
  it('Picks up a snowpack config within package.json', async () => {
    const result = await testFixture(
      {},
      {
        'index.js': dedent`
          console.log(import.meta.env);
        `,
        'package.json': dedent`
          {
            "version": "0.1.0",
            "name": "@snowpack/test-config-loading-package",
            "snowpack": {
              "buildOptions": {
                "out": "TEST_BUILD_OUT"
              }
            }
          }
        `,
      },
      {absolute: true},
    );
    expect(Object.keys(result).every((x) => x.match('/TEST_BUILD_OUT/'))).toBeTruthy();
  });
});
