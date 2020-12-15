const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const snowpack = require('../../../snowpack');
const {getFile} = require('../../test-utils');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

 

describe('CDN URLs', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './public')]: '/',
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('HTML: preserves remote URLs', () => {
    const $ = cheerio.load( getFile(result, TEST_OUT, './index.html'));
    expect($('script[src^="https://unpkg.com"]')).toBeTruthy();
  });

  it('JS: preserves CDN URLs', () => {
    expect( getFile(result, TEST_OUT, './_dist_/index.js')).toEqual(
      expect.stringContaining('import React from "https://cdn.pika.dev/react@^16.13.1";'),
    );
    expect( getFile(result, TEST_OUT, './_dist_/index.js')).toEqual(
      expect.stringContaining('import ReactDOM from "https://cdn.pika.dev/react-dom@^16.13.1";'),
    );
  });

  it('JS: doesn’t install remote packages locally', () => {
    const webModulesLoc = path.join(__dirname, 'build', 'web_modules');
    expect(fs.existsSync(webModulesLoc)).toBe(false);
  });
});
