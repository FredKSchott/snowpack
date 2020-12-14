const execa = require('execa');
const npmRunPath = require('npm-run-path');

function typescriptPlugin(snowpackConfig_, {args} = {}) {
  return {
    name: '@snowpack/plugin-typescript',
    async run({isDev, log}) {
      const workerPromise = execa.command(
        `tsc --noEmit ${isDev ? '--watch' : ''} ${args ? args : ''}`,
        {
          env: npmRunPath.env(),
          extendEnv: true,
          windowsHide: false,
          cwd: snowpackConfig.root || process.cwd(),
        },
      );
      const {stdout, stderr} = workerPromise;
      function dataListener(chunk) {
        let stdOutput = chunk.toString();
        // In --watch mode, handle the "clear" character
        if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
          log('WORKER_RESET', {});
          stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
        }
        log('WORKER_MSG', {level: 'log', msg: stdOutput});
      }
      stdout && stdout.on('data', dataListener);
      stderr && stderr.on('data', dataListener);
      return workerPromise;
    },
  };
}

module.exports = typescriptPlugin;
