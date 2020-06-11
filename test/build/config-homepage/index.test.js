const fs = require('fs');
const path = require('path');
const execa = require('execa');

it('config.homepage', async () => {
  await execa('npm', ['run', 'TEST'], { cwd: __dirname });
  const outputPath = path.resolve(__dirname, 'build', 'dist', 'index.js');
  const output = fs.readFileSync(outputPath, 'utf8');
  expect(output).toContain('/static/web_modules/shallow-equal.js');
});
