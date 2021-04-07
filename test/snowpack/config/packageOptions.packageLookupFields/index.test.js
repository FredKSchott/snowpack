const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('packageLookupFields', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'silent';
  });

  it('Should resolve modules from the package lookup fields', async () => {
    const result = await testFixture(
      {
        packageOptions: {
          packageLookupFields: ['custom-lookup'],
        },
      },
      {
        'index.js': dedent`
          import 'some-custom-lookup-package';
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-config-package-lookup-fields",
            "dependencies": {
              "some-custom-lookup-package": "file:./packages/some-custom-lookup"
            }
          }
        `,
        'packages/some-custom-lookup/package.json': dedent`
          {
            "version": "1.0.0",
            "name": "some-custom-lookup-package",
            "custom-lookup": "good.js",
            "module": "bad.js"
          }
        `,
        'packages/some-custom-lookup/bad.js': dedent`
          console.log('THIS IS THE BAD ENTRYPOINT');
        `,
        'packages/some-custom-lookup/good.js': dedent`
          console.log('THIS IS THE GOOD ENTRYPOINT');
        `,
      },
    );
    expect(result['index.js']).toEqual(
      expect.stringContaining(`import './_snowpack/pkg/some-custom-lookup-package.js';`),
    );
    expect(result['_snowpack/pkg/some-custom-lookup-package.js']).toEqual(
      expect.stringContaining(`console.log('THIS IS THE GOOD ENTRYPOINT');`),
    );
  });
});
