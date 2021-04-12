const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('packageOptions.external', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Does not transform imports of external modules', async () => {
    const result = await testFixture(
      {
        packageOptions: {
          external: ['fs'],
        },
      },
      {
        'index.js': dedent`
          import 'fs';
          import 'array-flatten';
        `,
      },
    );
    expect(result['index.js']).toEqual(expect.stringContaining(`import 'fs';`));
  });
});
