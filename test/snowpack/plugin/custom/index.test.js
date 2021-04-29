const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('custom plugin', () => {
  it('allows custom filetypes to be created', async () => {
    const result = await testFixture({
      'dev/html-plugin.js': dedent`
        module.exports = function htmlPlugin(_snowpackConfig, _pluginOptions) {
          return {
            name: 'html-plugin',
            resolve: {
              input: ['.h1'],
              output: ['.html', '.css'],
            },
            async load() {
              return {
                '.html': { code: '<h1>Hello world</h1>' },
                '.css': { code: '.h1 { color: red }' },
              }
            },
          }
        }
      `,
      'src/test.h1': ``, // empty file (generated via plugin)
      'snowpack.config.json': dedent`
        {
          "mount": {
            "src": "/"
          },
          "plugins": [
            "./dev/html-plugin.js"
          ]
        }
      `,
    });

    // Test 1: HTML is correctly output
    expect(result['test.h1.html']).toBe(`<h1>Hello world</h1>`);

    // Test 2: CSS is correctly output
    expect(result['test.h1.css']).toBe(`.h1 { color: red }`);

    // Test 3: the source file didn’t clutter up the build folder
    expect(result['test.h1']).toBeFalsy();
  });
});
