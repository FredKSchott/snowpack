const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('JS resolution', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('resolves node_modules correctly', () => {
    // this tests that we are using the node_modules version, not the local 'is-array.js'
    expect(files['/index.js']).toEqual(
      expect.stringContaining(`import isArray from './_snowpack/pkg/is-array.js';`),
    );
  });

  it('resolves absolute URLs correctly', () => {
    // this tests that a URL-style import works
    expect(files['/a/a.js']).toEqual(expect.stringContaining(`import '../index.js';`));
    // this ensures that we don't mistakenly import an index file from a directory with the same name
    expect(files['/index.js']).toEqual(expect.stringContaining(`import b from './b.js';`));
  });
});
