const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('config: instantiated objects', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  it('instantiated objects don’t affect build', () => {
    expect(Object.keys(files)).toEqual([
      '/dist/index.css',
      '/dist/index.js',
      '/dist/index.js.map',
      '/dist/logo.svg',
      '/index.html',
    ]);
  });
});
