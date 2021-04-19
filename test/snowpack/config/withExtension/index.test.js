const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('withExtension', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Picks up a snowpack config with .cjs extension', async () => {
    const result = await testFixture(
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

  /* 

  CLI test: test/build/config-loading-esm-package
  Reason for skip: Fails locally because Jest can't handle es module syntax (export)
  
  Error:

    SyntaxError: Unexpected token 'export'

        17 |               console.error(`Failed to load "${filepath}"!\nESM format is not natively supported in "node@${process.version}".\nPlease use CommonJS or upgrade to an LTS version of node above "node@12.17.0".`)
        18 |             } else if (e.code === 'ERR_REQUIRE_ESM') {
      > 19 |                 const url = pathToFileURL(filepath);
          |                 ^
        20 |                 return NATIVE_IMPORT(url).then(mdl => resolve(mdl.default ? mdl.default : mdl));
        21 |             };
        22 |             reject(e);

        at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1350:14)
        at snowpack/assets/require-or-import.js:19:17
        at Object.REQUIRE_OR_IMPORT (snowpack/assets/require-or-import.js:17:10)
        at loadConfigurationFile (snowpack/lib/config.js:634:33)
    
  */

  it.skip('Picks up a snowpack config inside of a "module" type package', async () => {
    const result = await testFixture(
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

  /* 

  CLI test: test/build/config-loading-mjs
  Reason for skip: Fails locally because Jest can't handle es module syntax (export)
  
  Error:

    SyntaxError: Unexpected token 'export'

        17 |               console.error(`Failed to load "${filepath}"!\nESM format is not natively supported in "node@${process.version}".\nPlease use CommonJS or upgrade to an LTS version of node above "node@12.17.0".`)
        18 |             } else if (e.code === 'ERR_REQUIRE_ESM') {
      > 19 |                 const url = pathToFileURL(filepath);
          |                 ^
        20 |                 return NATIVE_IMPORT(url).then(mdl => resolve(mdl.default ? mdl.default : mdl));
        21 |             };
        22 |             reject(e);

        at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1350:14)
        at snowpack/assets/require-or-import.js:19:17
        at Object.REQUIRE_OR_IMPORT (snowpack/assets/require-or-import.js:17:10)
        at loadConfigurationFile (snowpack/lib/config.js:634:33)
    
  */

  it.skip('Picks up a snowpack config with .mjs extension', async () => {
    const result = await testFixture(
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

  it('Picks up a snowpack config with .json extension', async () => {
    const result = await testFixture(
      {
        'index.js': dedent`
          console.log(import.meta.env);
        `,
        'snowpack.config.json': dedent`
          {
            "buildOptions": {
              "out": "TEST_BUILD_OUT"
            }
          }
        `,
      },
      {absolute: true},
    );

    expect(Object.keys(result).every((x) => x.match('/TEST_BUILD_OUT/'))).toBeTruthy();
  });

  it('Picks up a snowpack config within package.json', async () => {
    const result = await testFixture(
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
