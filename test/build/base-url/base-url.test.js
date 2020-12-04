const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const cwd = path.join(__dirname, 'build');

const html = fs.readFileSync(path.join(cwd, 'index.html'), 'utf8');
const indexJS = fs.readFileSync(path.join(cwd, 'index.js'), 'utf-8');
const distJS = fs.readFileSync(path.join(cwd, '_dist_', 'index.js'), 'utf-8');
const $ = cheerio.load(html);

describe('buildOptions.baseUrl', () => {
  it('baseUrl works for <link>', () => {
    expect($('link[rel="icon"]').attr('href').startsWith('/static/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('/static/')).toBe(true);
  });

  it('baseUrl works for <script>', () => {
    expect($('script').attr('src').startsWith('/static/')).toBe(true);
  });

  it('import.meta.env works', () => {
    // env is present in index.js
    expect(indexJS).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from './__snowpack__/env.js';`),
    );
    expect(indexJS).toEqual(expect.stringContaining(`import.meta.env = __SNOWPACK_ENV__;`));

    // env is present in _dist_/index.js too
    expect(distJS).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from '../__snowpack__/env.js';`),
    );
    expect(distJS).toEqual(expect.stringContaining(`import.meta.env = __SNOWPACK_ENV__;`));
  });
});
