const {wrapImportProxy} = require('../../../snowpack/lib/build/build-import-proxy.js');

describe('build-import-proxy', () => {
  describe('wrapImportProxy()', () => {
    const config = {buildOptions: {metaDir: '__snowpack__'}};

    it('.css', async () => {
      expect(
        await wrapImportProxy({
          url: '/styles.css',
          code: 'body { font-size: 100%; }',
          hmr: false,
          config,
        }),
      ).toBe(`// [snowpack] add styles to the page (skip if no document exists)
if (typeof document !== 'undefined') {
  const code = \"body { font-size: 100%; }\";

  const styleEl = document.createElement(\"style\");
  const codeEl = document.createTextNode(code);
  styleEl.type = 'text/css';

  styleEl.appendChild(codeEl);
  document.head.appendChild(styleEl);
}`);
    });

    it('.css (hmr)', async () => {
      expect(
        await wrapImportProxy({
          url: '/styles.css',
          code: 'body { font-size: 100%; }',
          hmr: true,
          config,
        }),
      ).toBe(`import * as  __SNOWPACK_HMR__ from '/__snowpack__/hmr-client.js';
import.meta.hot = __SNOWPACK_HMR__.createHotContext(import.meta.url);

// [snowpack] add styles to the page (skip if no document exists)
if (typeof document !== 'undefined') {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    document.head.removeChild(styleEl);
  });

  const code = \"body { font-size: 100%; }\";

  const styleEl = document.createElement(\"style\");
  const codeEl = document.createTextNode(code);
  styleEl.type = 'text/css';

  styleEl.appendChild(codeEl);
  document.head.appendChild(styleEl);
}`);
    });

    it('.js', async () => {
      expect(
        await wrapImportProxy({
          url: '/index.js',
          code: `import './styles.css';`,
          hmr: false,
          config,
        }),
      ).toBe(`export default "/index.js";`);
    });

    it('.json', async () => {
      expect(
        await wrapImportProxy({
          url: '/data.json',
          code: `["red", "green", "blue"]`,
          hmr: false,
          config,
        }),
      ).toBe(`let json = [\"red\",\"green\",\"blue\"];
export default json;`);
    });
  });
});
