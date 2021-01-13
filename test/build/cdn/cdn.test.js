const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('CDN URLs', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('HTML: preserves remote URLs', () => {
    const $ = cheerio.load(files['/index.html']);
    expect($('script[src^="https://unpkg.com"]')).toBeTruthy();
  });

  it('JS: preserves CDN URLs', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining('import React from "https://cdn.pika.dev/react@^16.13.1";'),
    );
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining('import ReactDOM from "https://cdn.pika.dev/react-dom@^16.13.1";'),
    );
  });

  it('JS: doesn’t install remote packages locally', () => {
    const webModulesLoc = path.join(__dirname, 'build', '_snowpack', 'pkg');
    expect(fs.existsSync(webModulesLoc)).toBe(false);
  });
});
