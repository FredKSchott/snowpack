const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config: environment', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  it('Should load environment from config', () => {
    expect(files['/_snowpack/env.js']).toContain('export const API_URL = "TEST";');
  });
});
