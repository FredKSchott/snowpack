const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('suite', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('test', async () => {
    const result = await testFixture({
      'index.js': dedent`
        // Content to prevent readFile error
      `,
      'snowpack.config.js': dedent`
        module.exports = {}
      `,
    });
    expect(result['index.js']);
  });
});
