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
    expect($('link[rel="icon"]').attr('href').startsWith('https://www.example.com/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('https://www.example.com/')).toBe(
      true,
    );
  });

  it('baseUrl works for <script>', () => {
    const $ = cheerio.load(files['/index.html']);
    expect($('script').attr('src').startsWith('https://www.example.com/')).toBe(true);
  });
});
