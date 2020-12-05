const path = require('path');
const cheerio = require('cheerio');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};
let $;

describe('buildOptions.baseUrl', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(['index.html', 'index.js', '_dist_/index.js'], {cwd});
    $ = cheerio.load(files['/index.html']);
  });

  it('baseUrl works for <link>', () => {
    expect($('link[rel="icon"]').attr('href').startsWith('/static/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('/static/')).toBe(true);
  });

  it('baseUrl works for <script>', () => {
    expect($('script').attr('src').startsWith('/static/')).toBe(true);
  });

  it('import.meta.env works', () => {
    // env is present in index.js
    expect(files['/index.js']).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from './__snowpack__/env.js';`),
    );
    expect(files['/index.js']).toEqual(
      expect.stringContaining(`import.meta.env = __SNOWPACK_ENV__;`),
    );

    // env is present in _dist_/index.js too
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from '../__snowpack__/env.js';`),
    );
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import.meta.env = __SNOWPACK_ENV__;`),
    );
  });
});
