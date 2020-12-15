const path = require('path');
const cheerio = require('cheerio');
const snowpack = require('../../../snowpack');
const {getFile} = require('../../test-utils');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

describe('buildOptions.baseUrl', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './public')]: '/',
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        baseUrl: '/static/',
        out: TEST_OUT,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('baseUrl works for <link>', () => {
    const $ = cheerio.load( getFile(result, TEST_OUT, './index.html'));
    expect($('link[rel="icon"]').attr('href').startsWith('/static/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('/static/')).toBe(true);
  });

  it('baseUrl works for <script>', () => {
    const $ = cheerio.load( getFile(result, TEST_OUT, './index.html'));
    expect($('script').attr('src').startsWith('/static/')).toBe(true);
  });

  it('import.meta.env works', () => {
    // env is present in index.js
    expect( getFile(result, TEST_OUT, './index.js')).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from './__snowpack__/env.js';`),
    );
    expect( getFile(result, TEST_OUT, './index.js')).toEqual(
      expect.stringContaining(`import.meta.env = __SNOWPACK_ENV__;`),
    );

    // env is present in _dist_/index.js too
    expect( getFile(result, TEST_OUT, './_dist_/index.js')).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from '../__snowpack__/env.js';`),
    );
    expect( getFile(result, TEST_OUT, './_dist_/index.js')).toEqual(
      expect.stringContaining(`import.meta.env = __SNOWPACK_ENV__;`),
    );
  });
});
