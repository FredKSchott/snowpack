const {testFixture} = require('../../../fixture-utils');

describe('buildOptions.baseUrl', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  describe.each([
    ['local URL path', '/static/'],
    ['remote URL', 'https://www.example.com'],
  ])('%s', (_, baseUrl) => {
    const config = {buildOptions: {baseUrl}};

    it('generates correct relative package imports', async () => {
      const result = await testFixture(config, `import {flatten} from 'array-flatten';`);
      expect(result['index.js']).toMatchSnapshot();
    });

    it('generates correct <link> attributes', async () => {
      const result = await testFixture(config, {
        'index.html': `
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <link rel="stylesheet" type="text/css" href="%PUBLIC_URL%/index.css" />
  </head>
</html>`,
      });
      expect(result['index.html']).toMatchSnapshot();
    });

    it('generates correct <script> attributes', async () => {
      const result = await testFixture(config, {
        'index.html': `
<!DOCTYPE html>
<html lang="en">
  <body><script type="module" src="%PUBLIC_URL%/_dist_/index.js"></script></body>
</html>`,
      });
      expect(result['index.html']).toMatchSnapshot();
    });

    it('generates correct import proxies', async () => {
      const result = await testFixture(config, {
        'index.js': `import logo from './logo.png';`,
        'logo.png': Buffer.from(''),
      });

      expect(result['index.js']).toMatchSnapshot();
      expect(result['logo.png.proxy.js']).toMatchSnapshot();
    });

    it('generates correct import.meta.env imports', async () => {
      const result = await testFixture(config, `console.log(import.meta.env)`);
      expect(result['index.js']).toMatchSnapshot();
    });
  });
});
