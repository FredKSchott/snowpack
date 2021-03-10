const { loadConfiguration } = require('snowpack');

describe('config loading', () => {
  it('picks up snowpack.config.cjs', async () => {
    const config = await loadConfiguration();
    expect(config.buildOptions.out).toBe('TEST_BUILD_OUT');
  });
});
