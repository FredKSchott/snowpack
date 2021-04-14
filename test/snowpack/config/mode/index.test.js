const dedent = require('dedent');
const {testFixture} = require('../../../fixture-utils');

describe('mode', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it.skip('throws when mode is some unknown value', async () => {
    const result = await testFixture({
      'index.js': dedent`console.log(import.meta.env.MODE)`,
      'snowpack.config.js': dedent`
        module.exports = {
          mode: 'UNEXPECTED'
        }
      `,
    }).catch(() => null);
    if (result !== null) {
      throw new Error('Expected to reject!');
    }
  });

  // For some reason, this is failing in CI. I think Luke Jackson has probably already solved this in his PR.
  // Otherwise, take the time to investigate and understand why.
  describe.each([
    ['mode=production', 'production'],
    ['mode=development', 'development'],
    ['mode=test', 'test'],
  ])('%s', (_, modeValue) => {
    it('builds correctly', async () => {
      const result = await testFixture({
        'index.js': dedent`console.log(import.meta.env.MODE)`,
        'snowpack.config.js': dedent`
          module.exports = {
            mode: '${modeValue}'
          }
        `,
      });
      expect(result['_snowpack/env.js']).toContain(`const NODE_ENV = "${modeValue}"`);
    });
  });
});
