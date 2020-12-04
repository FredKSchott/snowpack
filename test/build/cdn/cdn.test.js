const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const cwd = path.join(__dirname, 'build');

const html = fs.readFileSync(path.join(cwd, 'index.html'), 'utf-8');
const distJS = fs.readFileSync(path.join(cwd, '_dist_', 'index.js'), 'utf-8');

const $ = cheerio.load(html);

describe('CDN URLs', () => {
  it('HTML: preserves remote URLs', () => {
    expect($('script[src^="https://unpkg.com"]')).toBeTruthy();
  });

  it('JS: preserves CDN URLs', () => {
    expect(distJS).toEqual(
      expect.stringContaining('import React from "https://cdn.pika.dev/react@^16.13.1";'),
    );
    expect(distJS).toEqual(
      expect.stringContaining('import ReactDOM from "https://cdn.pika.dev/react-dom@^16.13.1";'),
    );
  });

  it('JS: doesn’t install remote packages locally', () => {
    const webModulesLoc = path.join(__dirname, 'build', 'web_modules');
    expect(fs.existsSync(webModulesLoc)).toBe(false);
  });
});
