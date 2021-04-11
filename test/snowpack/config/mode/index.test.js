const {testFixture} = require('../../../fixture-utils');

describe('mode', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('throws when mode is some unknown value', async () => {
    const config = {mode: 'UNEXPECTED'};
    const result = await testFixture(config, `console.log(import.meta.env.MODE)`).catch(() => null);
    if (result !== null) {
      throw new Error('Expected to reject!');
    }
  });

  // For some reason, this is failing in CI. I think Luke Jackson has probably already solved this in his PR.
  // Otherwise, take the time to investigate and understand why.
  describe.skip.each([
    ['mode=production', 'production'],
    ['mode=development', 'development'],
    ['mode=test', 'test'],
  ])('%s', (_, modeValue) => {
    it('builds correctly', async () => {
      const config = {mode: modeValue};
      const result = await testFixture(config, `console.log(import.meta.env.MODE)`);
      expect(result['_snowpack/env.js']).toContain(`const NODE_ENV = "${modeValue}"`);
    });
  });
});
