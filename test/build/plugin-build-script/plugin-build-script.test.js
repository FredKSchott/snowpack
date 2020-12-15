const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');

describe('@snowpack/plugin-build-script', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
      },
      plugins: [
        [
          '@snowpack/plugin-build-script',
          {
            input: ['.ts'],
            output: ['.js'],
            cmd: 'babel --filename $FILE --presets @babel/preset-typescript',
          },
        ],
      ],
    });
    await snowpack.buildProject({config, lockfile: null});
  });

  it('runs Babel on TS', () => {
    const jsLoc = path.join(TEST_OUT, '_dist_', 'index.js');
    expect(fs.existsSync(jsLoc)).toBe(true); // file exists
    expect(fs.readFileSync(jsLoc, 'utf-8')).toBeTruthy(); // file has content
  });

  it('doesn’t leave TS in build', () => {
    const tsLoc = path.join(TEST_OUT, '_dist_', 'index.ts');
    expect(fs.existsSync(tsLoc)).not.toBe(true); // file doesn’t exist
  });
});
