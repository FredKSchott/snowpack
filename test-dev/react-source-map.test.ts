const path = require('path');

const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');
const {get} = require('httpie');

describe('snowpack dev', () => {
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

  it('react-source-map', async () => {
    expect.assertions(6);

    const cwd = path.join(__dirname, 'react-source-map');

    // start the server
    // NOTE: we tried spawning `yarn` here, but the process was not cleaned up
    //       correctly on CI and the action got stuck. npx does not cause that problem.
    snowpackProcess = execa(
      path.resolve('node_modules', '.bin', 'snowpack'),
      ['dev', '--verbose', '--output', 'stream'],
      {cwd},
    );

    snowpackProcess.stdout.pipe(process.stdout);
    snowpackProcess.stderr.pipe(process.stderr);

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
          resolve(undefined);
          clearTimeout(timeout);
        }
      });
    });

    // get HTML
    const {data: htmlBody} = await get('http://localhost:8081');
    expect(htmlBody).toMatchSnapshot('html');

    // get built index JS
    const {data: indexJs} = await get('http://localhost:8081/_dist_/index.js');
    expect(indexJs).toMatchSnapshot('index.js');

    // get built index map
    const {data: indexJsMap} = await get('http://localhost:8081/_dist_/index.js.map');
    expect(indexJsMap).toMatchSnapshot('index.js.map');

    // get built app JS
    const {data: appJs} = await get('http://localhost:8081/_dist_/app.js');
    expect(appJs).toMatchSnapshot('app.js');

    // get built app map
    const {data: appJsMap} = await get('http://localhost:8081/_dist_/app.js.map');
    expect(appJsMap).toMatchSnapshot('app.js.map');
  });
});
