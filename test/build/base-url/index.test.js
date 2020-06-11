const fs = require('fs');
const path = require('path');
const execa = require('execa');

it('buildOptions.baseUrl', () => {
  // %PUBLIC_URL% gets replaced with this setting
  execa.sync('npm', ['run', 'TEST'], {cwd: __dirname});

  const outputHTML = fs.readFileSync(path.resolve(__dirname, 'build', 'index.html'), 'utf8');

  const iconMatch = outputHTML.match(/<link rel="icon" href="([^"]+)/)[1];
  const cssMatch = outputHTML.match(/<link rel="stylesheet" type="text\/css" href="([^"]+)/)[1];
  const jsMatch = outputHTML.match(/<script type="module" src="([^"]+)/)[1];

  expect(iconMatch).toBe('/static/favicon.ico');
  expect(cssMatch).toBe('/static/index.css');
  expect(jsMatch).toBe('/static/_dist_/index.js');
});
