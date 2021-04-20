const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('plugin', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('@snowpack/plugin-babel runs before esbuild', async () => {
    const result = await testFixture({
      'index.tsx': dedent`
        import {StrictMode} from 'react'
        import {render} from 'react-dom'
        
        render(
          <StrictMode>
            <span>Hello World!</span>
          </StrictMode>,
          document.querySelector('#root'),
        );  
      `,
      'index.html': dedent`
        <html>
        <head><title>Test</title></head>
        <body><script type="module" src="/dist/index.js"></script></body>
        </html>
      `,
      'package.json': dedent`
        {
          "version": "1.0.1",
          "name": "@snowpack/test-plugin-babel",
          "devDependencies": {
            "@snowpack/plugin-babel": "^2.1.7",
            "react": "17.0.2"
          }
        }
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          packageOptions: {
            knownEntrypoints: ['react/jsx-runtime'],
          },
          plugins: [
            ['@snowpack/plugin-babel', {input: ['.tsx']}]
          ]
        };
      `,
      'babel.config.js': dedent`
        module.exports = {
          presets: [
            ['@babel/preset-react', {runtime: 'automatic'}],
            '@babel/preset-typescript',
          ],
        }
      `
    });

    expect(result['index.js']).toContain(`_jsx(StrictMode`);
  });
});
