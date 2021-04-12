const {testFixture} = require('../../../fixture-utils');
const {promises: fs} = require('fs');
const path = require('path');

describe('buildOptions.out', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('builds to the correct relative out path', async () => {
    const config = {buildOptions: {out: 'TEST_OUT'}};
    const result = await testFixture(config, `// Intentionally left blank.`, {absolute: true});
    expect(Object.keys(result).every((f) => f.includes('TEST_OUT')));
  });

  it('builds to the correct absolute out path', async () => {
    const outDir = await fs.mkdtemp(
      path.join(__dirname, '..', '..', '..', '__temp__', 'TEST_OUT-'),
    );
    const config = {buildOptions: {out: outDir}};
    const result = await testFixture(config, `// Intentionally left blank.`, {absolute: true});
    expect(Object.keys(result).every((f) => f.startsWith(outDir)));
  });
});
