const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const STRIP_WHITESPACE = /((\s+$)|((\\r\\n)|(\\n)))/gm;
const cwd = path.join(__dirname, 'build');
let files = {};

describe('import-json', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(
      [
        '_dist_/index.js',
        '_dist_/file.json.proxy.js',
        'web_modules/json-test-pkg/file.json.proxy.js',
      ],
      {
        cwd,
      },
    );
  });

  it('imports in source file are transformed correctly', () => {
    expect(files['/_dist_/index.js'].replace(STRIP_WHITESPACE, '')).toEqual(`import testJsonData from './file.json.proxy.js';
import testJsonPkgData from '../web_modules/json-test-pkg/file.json.proxy.js';
console.log('loaded:', testJsonData, testJsonPkgData);`);
  });

  it('local json file is built as expected', () => {
    expect(files['/_dist_/file.json.proxy.js'].replace(STRIP_WHITESPACE, '')).toEqual(`let json = {"test":true};
export default json;`);
  });

  it('npm package json file is imported as expected', () => {
    expect(files['/web_modules/json-test-pkg/file.json.proxy.js'].replace(STRIP_WHITESPACE, ''))
      .toEqual(`let json = {"test-json-pkg":true};
export default json;`);
  });
});
