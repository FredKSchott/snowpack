const path = require('path');
const {setupBuildTest, readFiles, stripWS} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('import-json', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
    console.log(files);
  });

  it('imports in source file are transformed correctly', () => {
    expect(stripWS(files['/_dist_/index.js']))
      .toEqual(`import testJsonData from './file.json.proxy.js';
import testJsonPkgData from '../_snowpack/pkg/json-test-pkg/file.json.proxy.js';
console.log('loaded:', testJsonData, testJsonPkgData);`);
  });

  it('local json file is built as expected', () => {
    expect(stripWS(files['/_dist_/file.json.proxy.js'])).toEqual(`let json = {"test":true};
export default json;`);
  });

  it('npm package json file is imported as expected', () => {
    expect(stripWS(files['/_snowpack/pkg/json-test-pkg/file.json.proxy.js']))
      .toEqual(`let json = {"test-json-pkg":true};
export default json;`);
  });
});
