const path = require('path');
const Stream = require('stream');

const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');
const got = require('got');

describe('snowpack dev', () => {
  it('smoke', async () => {
    const cwd = path.join(__dirname, 'smoke');
    const streamLogsToOutput = new Stream.Writable({objectMode: true});

    // start the server
    const snowpackProcess = execa('yarn', ['teststart'], {cwd});
    snowpackProcess.stdout.pipe(streamLogsToOutput);

    // await server to be ready and set a timeout in case something goes wrong
    await new Promise((resolve, reject) => {
      // start timeout in case something goes wrong.
      const timeout = setTimeout(() => {
        snowpackProcess.cancel();
        console.error(output.join(''));
        reject(new Error('Timeout: snowpack did not start server within 3 seconds.'));
      }, 3000);

      const output = [];
      streamLogsToOutput._write = (buffer, encoding, done) => {
        const line = buffer.toString();
        output.push(line);
        if (/Server started in/.test(line)) {
          resolve();
          clearTimeout(timeout);
        }

        done();
      };
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
