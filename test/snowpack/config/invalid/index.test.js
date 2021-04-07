const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('invalid', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Warns of invalid config values', async () => {
    await testFixture(
      {
        buildOptions: {
          ssr: 'shallow-equal',
        },
      },
      '',
    ).catch((e) =>
      expect(e.message).toMatch('- snowpack.buildOptions.ssr is not of a type(s) boolean'),
    );
  });
});
