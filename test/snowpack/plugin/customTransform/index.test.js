const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Custom transform hook', async () => {
    const result = await testFixture({
      'index.js': dedent`
        import './submodule.ts';
        console.log('loaded');
      `,
      'submodule.ts': dedent`
        console.log('ts loaded');
      `,
      'custom-transform-plugin.js': dedent`
        const MagicString = require('magic-string');

        module.exports = function () {
          return {
            transform: async ({id, fileExt, contents}) => {
              const ms = new MagicString(contents);
              ms.appendLeft(contents.indexOf('console.log'), "console.log('transformed');");
              const map = ms.generateMap({hires: false, includeContent: true});
              // Due to Windows issue, we set "sources" here (and not in generateMap())
              map.sources = [id];
              return {
                contents: ms.toString(),
                // Try returning both object and string map formats.
                map: fileExt === '.js' ? map : map.toString(),
              };
            },
          };
        };
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-plugin-hook-transform",
          "devDependencies": {
            "magic-string": "^0.25.7"
          }
        } 
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          buildOptions: {
            sourcemap: true,
          },
          plugins: ['./custom-transform-plugin.js'],
        };
      `,
    });

    const SEARCH_STRING = `console.log('transformed');`;
    expect(result['index.js']).toContain(SEARCH_STRING);
    expect(result['submodule.js']).toContain(SEARCH_STRING);
  });
});
