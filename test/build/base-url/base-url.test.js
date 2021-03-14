const path = require('path');
const cheerio = require('cheerio');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('buildOptions.baseUrl', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('baseUrl works for <link>', () => {
    const $ = cheerio.load(files['/index.html']);
    expect($('link[rel="icon"]').attr('href').startsWith('/static/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('/static/')).toBe(true);
  });

  it('baseUrl works for <script>', () => {
    const $ = cheerio.load(files['/index.html']);
    expect($('script').attr('src').startsWith('/static/')).toBe(true);
  });

  it('import proxies works', () => {
    expect(files['/_dist_/logo.png.proxy.js']).toEqual(
      expect.stringContaining(`export default "/static/_dist_/logo.png";`),
    );
  });

  it('import.meta.env works', () => {
    // env is present in index.js
    expect(files['/index.js']).toEqual(
      expect.stringContaining(`import * as __SNOWPACK_ENV__ from './_snowpack/env.js';`),
    );
    expect(files['/index.js']).toEqual(expect.stringContaining(`console.log(__SNOWPACK_ENV__)`));

    // env is present in _dist_/index.js too
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import * as __SNOWPACK_ENV__ from '../_snowpack/env.js';`),
    );
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`console.log(__SNOWPACK_ENV__)`),
    );
  });
});
