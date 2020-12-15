const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

function getFile(id) {
  return result[path.resolve(TEST_OUT, id)].contents;
}

describe('module resolution', () => {
  beforeAll(async () => {
    const [, config] = snowpack.createConfiguration({
      root: TEST_ROOT,
      installOptions: {
        treeshake: false,
      },
      mount: {
        [path.resolve(TEST_ROOT, './public')]: '/',
      },
      buildOptions: {
        out: TEST_OUT,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('JS: resolves web_modules relatively', () => {
    expect(getFile('./src.js')).toEqual(
      expect.stringContaining(`import './web_modules/preact.js';`),
    );
  });

  it('HTML: <script> tags also resolve relatively', () => {
    expect(getFile('./index.html')).toEqual(
      expect.stringContaining(`import preact from './web_modules/preact.js';`),
    );
    expect(getFile('./folder-1/index.html')).toEqual(
      expect.stringContaining(`import preact from '../web_modules/preact.js';`),
    );
    expect(getFile('./folder-1/folder-2/index.html')).toEqual(
      expect.stringContaining(`import preact from '../../web_modules/preact.js';`),
    );
  });

  // TODO(drew): an “absolute” mode has been discussed as an option, however, it‘s tricky as it must factor in metaUrl, baseUrl, and more
});
