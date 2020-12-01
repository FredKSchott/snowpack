const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const {fileLines} = require('../../test-utils');

const html = fs.readFileSync(path.join(__dirname, 'build', 'index.html'), 'utf8');

const $ = cheerio.load(html);

const distJS = fileLines(path.join(__dirname, 'build', '_dist_', 'index.js'));

describe('CDN URLs', () => {
  it('HTML: preserves remote URLs', () => {
    expect($('script[src^="https://unpkg.com"]')).toBeTruthy();
  });

  it('JS: preserves CDN URLs', () => {
    expect(distJS[4]).toBe('import React from "https://cdn.pika.dev/react@^16.13.1";');
    expect(distJS[5]).toBe('import ReactDOM from "https://cdn.pika.dev/react-dom@^16.13.1";');
  });

  it('JS: doesn’t install remote packages locally', () => {
    const webModulesLoc = path.join(__dirname, 'build', 'web_modules');
    expect(fs.existsSync(webModulesLoc)).toBe(false);
  });
});
