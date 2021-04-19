const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('package', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  /* 

  CLI test: test/build/package-bootstrap
  Reason for skip: Passes locally on mac and works in an isolated project but fails on Ubuntu 10.x during CI
  
  Error:

    TypeError: Cannot read property 'toString' of undefined

    198 |     if (util_1.hasExtension(url, '.css')) {
    199 |         // if proxying a CSS file, remove its source map (the path no longer applies)
  > 200 |         const sanitized = code.toString().replace(/\/\*#\s*sourceMappingURL=[^/]+\//gm, '');
        |                                ^
    201 |         return util_1.hasExtension(url, '.module.css')
    202 |             ? generateCssModuleImportProxy({ url, code: sanitized, hmr, config })
    203 |             : generateCssImportProxy({ code: sanitized, hmr, config });

    at Object.wrapImportProxy (snowpack/lib/build/build-import-proxy.js:200:32)
    at flushFileQueue (snowpack/lib/commands/build.js:138:73)
    at Object.build (snowpack/lib/commands/build.js:196:5)
    at testFixture (test/fixture-utils.js:49:3)
    at Object.<anonymous> (test/snowpack/package/bootstrap/index.test.js:11:20)
  
  */
  it.skip('Loads bootstrap css correctly', async () => {
    const result = await testFixture({
      'index.js': dedent`
        import 'bootstrap/dist/css/bootstrap.min.css';
        console.log('CSS added to page!');
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-package-bootstrap",
          "dependencies": {
            "bootstrap": "^4.5.2"
          }
        }
      `,
    });

    expect(result['index.js']).toContain(
      `import './_snowpack/pkg/bootstrap/dist/css/bootstrap.min.css.proxy.js';`,
    );
  });
});
