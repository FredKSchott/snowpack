const path = require('path');

const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');
const got = require('got');

describe('snowpack dev', () => {
  // tests don't run on windows. `snowpackProcess` does not get ended correctly
  if (process.platform === 'win32') {
    it.todo('snowpack dev tests are currently not running on Windows');
    return;
  }

  let snowpackProcess;
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
    snowpackProcess = execa('npx', ['snowpack', 'dev'], {cwd, shell: true});

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
  });
});
