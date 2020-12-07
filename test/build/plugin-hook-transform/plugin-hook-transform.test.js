const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname);
let files = {};

const SEARCH_STRING = `console.log('transformed');`;

describe('plugin API: transform()', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('transforms JS', () => {
    // test 1: original code is NOT in source
    expect(files['/src/index.js']).not.toEqual(expect.stringContaining(SEARCH_STRING));

    // test 2: code is added in plugin
    expect(files['/build/_dist_/index.js']).toEqual(expect.stringContaining(SEARCH_STRING));
  });

  it('transforms TS', () => {
    // test 1: original code is NOT in source
    expect(files['/src/submodule.ts']).not.toEqual(expect.stringContaining(SEARCH_STRING));

    // test 2: code is added in plugin
    expect(files['/build/_dist_/submodule.js']).toEqual(expect.stringContaining(SEARCH_STRING));
  });
});
