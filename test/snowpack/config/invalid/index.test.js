const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('invalid', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'debug';
  });

  /* 

  CLI test: test/build/error-config-invalid
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
