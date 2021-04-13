const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('package', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Loads bootstrap css correctly', async () => {
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
