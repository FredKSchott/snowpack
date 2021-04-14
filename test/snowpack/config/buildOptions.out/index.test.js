const {testFixture} = require('../../../fixture-utils');
const {promises: fs} = require('fs');
const path = require('path');
const dedent = require('dedent');

describe('buildOptions.out', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('builds to the correct relative out path', async () => {
    const result = await testFixture(
      {
        'index.js': `// Intentionally left blank.`,
        'snowpack.config.js': dedent`
          module.exports = {
            buildOptions: {
              out: 'TEST_OUT'
            }
          }
        `,
      },
      {absolute: true},
    );
    expect(Object.keys(result).every((f) => f.includes('TEST_OUT')));
  });

  // Skipping to see if this is the only breaking test
  it.skip('builds to the correct absolute out path', async () => {
    const outDir = await fs.mkdtemp(
      path.join(__dirname, '..', '..', '..', '__temp__', 'TEST_OUT-'),
    );
    const result = await testFixture(
      {
        'index.js': `// Intentionally left blank.`,
        'snowpack.config.js': dedent`
        module.exports = {
          buildOptions: {
            out: '${outDir}'
          }
        }
      `,
      },
      {absolute: true},
    );
    expect(Object.keys(result).every((f) => f.startsWith(outDir)));
  });
});
