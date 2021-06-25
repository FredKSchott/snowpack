const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');
const snowpackLogger = require('snowpack').logger;

describe('packageOptions.source', () => {
  const prevLoggerLevel = snowpackLogger.level;

  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    snowpackLogger.level = 'error';
  });

  afterAll(() => {
    snowpackLogger.level = prevLoggerLevel;
  });

  it('Loads modules into cache when source is remote-next', async () => {
    const result = await testFixture({
      'index.js': dedent`
        import { flatten } from "array-flatten";
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-package-source-remote-next",
          "dependencies": {
            "array-flatten": "^3.0.0"
          }
        }
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          packageOptions: {
            source: 'remote-next',
          },
        };
      `,
    });
    expect(result['../.snowpack/source/package.json']).toBeDefined();
    expect(result['../.snowpack/source/package-lock.json']).toBeDefined();
    expect(result['../.snowpack/source/node_modules/array-flatten/package.json']).toBeDefined();
  });

  describe('source: "remote"', () => {
    let loggerInfos = [];

    beforeEach(() => {
      // We don't have a great way to introspect the streaming resolution, so we
      // sniff the logging messages.
      loggerInfos = [];
      snowpackLogger.level = 'info';
      snowpackLogger.on('info', (message) => {
        loggerInfos.push(message);
      });
    });

    it('streams from pkg.snowpack.dev by default', async () => {
      await testFixture({
        'index.js': dedent`
          import { flatten } from "array-flatten";
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-package-source-remote",
            "dependencies": {
            }
          }
        `,
        'snowpack.config.js': dedent`
          module.exports = {
            packageOptions: {
              source: 'remote',
            },
          };
        `,
      });

      expect(loggerInfos).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /import array-flatten@latest → https:\/\/pkg.snowpack.dev\/array-flatten/,
          ),
        ]),
      );
    });

    it('streams package from the requested origin', async () => {
      // NOTE: There is some caching issue that prevents re-acquisition of a
      // package acquired in the 'default origin' case above, so we use a
      // different package name here.
      await testFixture({
        'index.js': dedent`
          import skypack from "skypack";
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-package-source-remote",
            "dependencies": {
            }
          }
        `,
        'snowpack.config.js': dedent`
          module.exports = {
            packageOptions: {
              source: 'remote',
              origin: 'https://cdn.skypack.dev',
            },
          };
        `,
      });

      expect(loggerInfos).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/import skypack@latest → https:\/\/cdn.skypack.dev\/skypack/),
        ]),
      );
    });
  });
});
