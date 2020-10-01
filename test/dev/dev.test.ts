const path = require('path');

const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');
const got = require('got');

describe('snowpack dev', () => {
  it('smoke', async () => {
    const cwd = path.join(__dirname, 'smoke');

    // start the server
    const snowpackProcess = execa('yarn', ['teststart'], {cwd});

    // await server to be ready and set a timeout in case something goes wrong
    await new Promise((resolve, reject) => {
      // start timeout in case something goes wrong.
      const timeout = setTimeout(() => {
        snowpackProcess.cancel();
        console.error(output.join(''));
        reject(new Error('Timeout: snowpack did not start server within 3 seconds.'));
      }, 3000);

      const output = [];
      snowpackProcess.stdout.on('data', (buffer) => {
        const line = buffer.toString();
        output.push(line);
        if (/Server started in/.test(line)) {
          resolve();
          clearTimeout(timeout);
        }
      });
    });

    // get HTML
    const {body: htmlBody} = await got('http://localhost:8080');
    expect(htmlBody).toMatchSnapshot('html');

    // get built JS
    const {body: jsBody} = await got('http://localhost:8080/_dist_/index.js');
    expect(jsBody).toMatchSnapshot('js');

    // all set
    snowpackProcess.cancel();
  });
});
