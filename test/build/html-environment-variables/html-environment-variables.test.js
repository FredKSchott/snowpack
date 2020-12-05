const path = require('path');
const cheerio = require('cheerio');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};
describe('html-environment-variables', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(['index.html'], {cwd});
  });

  it('passes env vars into HTML', () => {
    const $ = cheerio.load(files['/index.html']);
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
