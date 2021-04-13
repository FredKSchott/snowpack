const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('invalid', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it.skip('Warns of invalid config values', async () => {
    await testFixture({
      'index.js': dedent`
        // Intentionally left blank
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          buildOptions: {
            ssr: 'shallow-equal',
          },
        };
      `,
    }).catch((e) =>
      expect(e.message).toMatch('- snowpack.buildOptions.ssr is not of a type(s) boolean'),
    );
  });
});
