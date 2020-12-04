const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const html = fs.readFileSync(path.join(__dirname, 'build', 'index.html'), 'utf8');

const $ = cheerio.load(html);

describe('packageManifest.homepage', () => {
  it('baseUrl works for <link>', () => {
    expect($('link[rel="icon"]').attr('href').startsWith('/static/')).toBe(true);
    expect($('link[rel="stylesheet"]').attr('href').startsWith('/static/')).toBe(true);
  });

  it('baseUrl works for <script>', () => {
    expect($('script').attr('src').startsWith('/static/')).toBe(true);
  });
});
