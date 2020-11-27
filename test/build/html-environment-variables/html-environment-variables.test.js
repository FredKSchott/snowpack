const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const {fileLines} = require('../../test-utils');

const html = fs.readFileSync(path.join(__dirname, 'build', 'index.html'), 'utf8');

const $ = cheerio.load(html);

describe('html-environment-variables', () => {
  it('passes env vars into HTML', () => {
    const htmlTag = $('html');

    // test an existing propery to make sure it still persists
    expect(htmlTag.attr('lang')).toBe('en');

    // test env vars
    expect(htmlTag.attr('data-mode')).toBe('production');
    expect(htmlTag.attr('data-public-url')).toBe('/');
    expect(htmlTag.attr('data-my-env-var')).toBe('my-var-replacement-configured-in-package.json');
    expect(htmlTag.attr('data-edge-case-test')).toBe('%SNOWPACK_PUBLIC_%');
    expect(htmlTag.attr('data-undefined')).toBe('%SNOWPACK_PUBLIC_BUILD_UNDEFINED%');
  });
});
