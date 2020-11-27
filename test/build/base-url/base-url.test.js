const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const {fileLines} = require('../../test-utils');

const html = fs.readFileSync(path.join(__dirname, 'build', 'index.html'), 'utf8');

const $ = cheerio.load(html);

const indexJS = fileLines(path.join(__dirname, 'build', 'index.js'));
const distJS = fileLines(path.join(__dirname, 'build', '_dist_', 'index.js'));

describe('buildOptions.baseUrl', () => {
  it('baseUrl works for <link>', () => {
    expect($('link[rel="icon"]').attr('href').startsWith('/static/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('/static/')).toBe(true);
  });

  it('baseUrl works for <script>', () => {
    expect($('script').attr('src').startsWith('/static/')).toBe(true);
  });

  it('import.meta.env works', () => {
    expect(indexJS[1]).toBe(`import __SNOWPACK_ENV__ from './__snowpack__/env.js';`);
    expect(indexJS[2]).toBe(`import.meta.env = __SNOWPACK_ENV__;`);

    expect(distJS[1]).toBe(`import __SNOWPACK_ENV__ from '../__snowpack__/env.js';`);
    expect(distJS[2]).toBe(`import.meta.env = __SNOWPACK_ENV__;`);
  });
});
