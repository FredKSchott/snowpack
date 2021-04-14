const dedent = require('dedent');
const {testFixture} = require('../../../fixture-utils');

describe('mode', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  /* 

  CLI test: No prexisting test
  Reason for skip: Used to throw but now just fails with process.exit called with "1"
  
  Error:

    428 |     logger_1.logger.error(`! ${filepath}\n${err.message}`);
    429 |     logger_1.logger.info(colors_1.dim(`See https://www.snowpack.dev for more info.`));
  > 430 |     process.exit(1);
        |             ^
    431 | }
    432 | function handleDeprecatedConfigError(mainMsg, ...msgs) {
    433 |     logger_1.logger.error(`${mainMsg}

    at handleValidationErrors (snowpack/lib/config.js:430:13)
    at Object.loadConfiguration (snowpack/lib/config.js:710:13)
    at testFixture (test/fixture-utils.js:46:18)
    at Object.<anonymous> (test/snowpack/config/invalid/index.test.js:12:7)
  
  */

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
