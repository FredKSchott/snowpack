const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('env', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Should load environment from config', async () => {
    const result = await testFixture(
      {
        env: {
          API_URL: 'TEST',
        },
      },
      {
        'index.js': dedent`
          console.log(import.meta.env['API_URL']);
        `,
      },
    );
    expect(result['_snowpack/env.js']).toContain('export const API_URL = "TEST";');
  });
});
