const dedent = require('dedent');
const {testFixture} = require('../../../fixture-utils');

describe('buildOptions.baseUrl', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  describe.each([
    ['local URL path', '/static/'],
    ['remote URL', 'https://www.example.com'],
  ])('%s', (_, baseUrl) => {
    const config = dedent`
      module.exports = {
        buildOptions: {
          baseUrl: "${baseUrl}"
        }
      }
    `;

    it('generates correct relative package imports', async () => {
      const result = await testFixture({
        'index.js': `import {flatten} from 'array-flatten';`,
        'snowpack.config.js': config,
      });
      expect(result['_snowpack/pkg/array-flatten.js']).toBeDefined();
      expect(result['index.js']).toContain(
        `import {flatten} from './_snowpack/pkg/array-flatten.js';`,
      );
    });

    it('generates correct <link> attributes', async () => {
      const result = await testFixture({
        'index.html': dedent`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
              <link rel="stylesheet" type="text/css" href="%PUBLIC_URL%/index.css" />
            </head>
          </html>
        `,
        'snowpack.config.js': config,
      });
      expect(result['index.html']).toContain(baseUrl);
    });

    it('generates correct <script> attributes', async () => {
      const result = await testFixture({
        'index.html': dedent`
          <!DOCTYPE html>
          <html lang="en">
            <body><script type="module" src="%PUBLIC_URL%/_dist_/index.js"></script></body>
          </html>
        `,
        'snowpack.config.js': config,
      });
      expect(result['index.html']).toContain(baseUrl);
    });

    it('generates correct import proxies', async () => {
      const result = await testFixture({
        'index.js': `import logo from './logo.png';`,
        'logo.png': Buffer.from(''),
        'snowpack.config.js': config,
      });

      expect(result['index.js']).toContain(`import logo from './logo.png.proxy.js';`);
      expect(result['logo.png.proxy.js']).toContain(baseUrl);
    });

    it('generates correct import.meta.env imports', async () => {
      const result = await testFixture({
        'index.js': `console.log(import.meta.env)`,
        'snowpack.config.js': config,
      });

      expect(result['index.js']).toContain(
        `import * as __SNOWPACK_ENV__ from './_snowpack/env.js'`,
      );
      expect(result['index.js']).toContain(`console.log(__SNOWPACK_ENV__)`);
    });
  });
});
