const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');

describe('config: mount scripts (legacy)', () => {
  beforeAll(async () => {
    const [, config] = snowpack.createConfiguration({
      root: TEST_ROOT,
      scripts: {
        'mount:src': 'mount src --to /_dist_',
        'mount:public': 'mount public --to /',
      },
      buildOptions: {
        out: TEST_OUT,
      },
    });
    await snowpack.buildProject({config, lockfile: null});
  });

  it('mounted ./src', () => {
    const jsLoc = path.join(TEST_OUT, '_dist_', 'index.js');
    expect(fs.existsSync(jsLoc)).toBe(true); // file exists
    expect(fs.readFileSync(jsLoc, 'utf8')).toBeTruthy(); // file has content
  });

  it('mounted ./public', () => {
    const htmlLoc = path.join(TEST_OUT, 'index.html');
    expect(fs.existsSync(htmlLoc)).toBe(true); // file exists
    expect(fs.readFileSync(htmlLoc, 'utf8')).toBeTruthy(); // file has content
  });
});
