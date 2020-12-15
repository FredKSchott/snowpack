const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

function getFile(id) {
  return result[path.resolve(TEST_OUT, id)].contents;
}

describe('@snowpack/plugin-optimize', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './public')]: '/',
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
      },
      plugins: [
        '@snowpack/plugin-sass',
        [
          '@snowpack/plugin-optimize',
          {
            minifyHTML: false, // makes diffs easier to compare
            minifyJS: false,
            preloadCSS: true, // the core of this test!
            preloadModules: true,
          },
        ],
      ],
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  describe('CSS', () => {
    it('generates imported-styles', () => {
      const importedStyles = path.join(TEST_OUT, 'imported-styles.css');
      expect(fs.existsSync(importedStyles)).toBe(true);
      expect(fs.readFileSync(importedStyles, 'utf-8').length).toBeGreaterThan(0);
    });
  });

  describe('HTML', () => {
    it('injects imported styles', () => {
      const $ = cheerio.load(getFile('./index.html'));
      expect($(`link[href$="imported-styles.css"]`)).toBeTruthy();
    });
  });

  describe('JS', () => {
    it('removes static CSS', () => {
      const ORIGINAL_IMPORTS = [
        `import 'water.css/out/water.min.css';`,
        `import './global.css';`,
        `import styleURL from './global-2.css';`,
      ];
      ORIGINAL_IMPORTS.forEach((i) => {
        expect(getFile('./_dist_/vanilla.js')).not.toEqual(expect.stringContaining(i));
      });
    });

    it('doesn’t remove dynamic CSS', () => {
      expect(getFile('./_dist_/vanilla.js')).toEqual(
        expect.stringContaining(`import("./dynamic-css.css.proxy.js");`),
      );
    });
  });

  describe('meta', () => {
    it('generates optimize-manifest', () => {
      const manifestLoc = path.join(TEST_OUT, '__snowpack__', 'optimize-manifest.json');
      expect(fs.existsSync(manifestLoc)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestLoc, 'utf-8'));
      expect(manifest.generated.preloadedCSS).toBeTruthy();
    });
  });
});
