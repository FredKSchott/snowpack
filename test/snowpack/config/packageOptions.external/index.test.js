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
});
