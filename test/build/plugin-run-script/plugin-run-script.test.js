const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');

describe('@snowpack/plugin-run-script', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './public')]: '/',
      },
      buildOptions: {
        out: TEST_OUT,
      },
      plugins: [
        [
          '@snowpack/plugin-run-script',
          {
            cmd: 'sass src/css:public/css --no-source-map',
          },
        ],
      ],
    });
    await snowpack.buildProject({config, lockfile: null});
  });

  it('generates .scss -> .css', () => {
    const css = path.join(TEST_OUT, 'css', 'index.css');
    expect(fs.existsSync(css)).toBe(true); // file exists
    expect(fs.readFileSync(css, 'utf-8')).toBeTruthy(); // file has content
  });
});
