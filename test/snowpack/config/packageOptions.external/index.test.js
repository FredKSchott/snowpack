const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('packageOptions.external', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Does not transform imports of external modules', async () => {
    const result = await testFixture({
      'index.js': dedent`
        import 'fs';
        import 'array-flatten';
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          packageOptions: {
            external: ['fs'],
          },
        };
      `,
    });

    expect(result['index.js']).toContain(`import 'fs';`);
  });

  it('Does not install externals that are deep package imports', async () => {
    const result = await testFixture({
      'packages/some-thing/main.js': dedent`
        export default 'ok';
      `,
      'packages/some-thing/deep.js': dedent`
        export default 'oops';
      `,
      'packages/some-thing/package.json': dedent`
        {
          "version": "1.0.0",
          "name": "some-thing",
          "module": "main.js"
        }
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-config-external",
          "dependencies": {
            "some-thing": "file:./packages/some-thing"
          }
        }
      `,
      'index.js': dedent`
        import 'some-thing';
        import 'some-thing/deep.js';
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          packageOptions: {
            external: ['some-thing/deep.js']
          }
        }
      `
    });

    expect(result['index.js']).toContain(`import 'some-thing/deep.js';`);
  })
});
