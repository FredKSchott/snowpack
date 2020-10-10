const path = require('path');

const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');
const fs = require('fs');
const {get} = require('httpie');

const debugFilePath = path.join(__dirname, './logs/debug.snowpack.log');
const errorFilePath = path.join(__dirname, './logs/error.snowpack.log');

describe('snowpack dev', () => {
  let snowpackProcess;

  beforeAll(() => {
    fs.closeSync(fs.openSync(debugFilePath, 'a'));
    fs.closeSync(fs.openSync(errorFilePath, 'a'));
  });

  afterEach(async () => {
    snowpackProcess.cancel();
    snowpackProcess.kill('SIGTERM', {
      forceKillAfterTimeout: 2000,
    });

    try {
      await snowpackProcess;
    } catch (error) {
      expect(error.killed).toEqual(true);
    }
  });

  it('smoke', async () => {
    expect.assertions(3);

    const cwd = path.join(__dirname, 'smoke');
    // start the server
    // NOTE: we tried spawning `yarn` here, but the process was not cleaned up
    //       correctly on CI and the action got stuck. npx does not cause that problem.
    snowpackProcess = execa(
      path.resolve('node_modules', '.bin', 'snowpack'),
      ['dev', '--verbose'],
      {cwd},
    );

    const streamLogFile = fs.createWriteStream(debugFilePath);
    const streamErrorFile = fs.createWriteStream(errorFilePath);
    snowpackProcess.stdout.pipe(streamLogFile);
    snowpackProcess.stderr.pipe(streamErrorFile);

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
    const {data: htmlBody} = await get('http://localhost:8080');
    expect(htmlBody).toMatchSnapshot('html');

    // get built JS
    const {data: jsBody} = await get('http://localhost:8080/_dist_/index.js');
    expect(jsBody).toMatchSnapshot('js');
  });
});
