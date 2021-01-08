const execa = require('execa');
const npmRunPath = require('npm-run-path');

const CLEAR_SEQUENCES = ['\x1Bc', '\x1B[2J\x1B[0;0f'];

function runScriptPlugin(snowpackConfig, {name, cmd, watch, output}) {
  const [cmdProgram] = cmd.split(' ');
  const watchCmd = watch && watch.replace('$1', cmd);

  return {
    name: name || cmdProgram,
    async run({isDev, log}) {
      const workerPromise = execa.command(isDev ? watchCmd || cmd : cmd, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        windowsHide: false,
        cwd: snowpackConfig.root || process.cwd(),
      });
      const {stdout, stderr} = workerPromise;
      function dataListener(chunk) {
        let stdOutput = chunk.toString();
        if (output === 'stream') {
          log('CONSOLE_INFO', {msg: stdOutput});
          return;
        }
        if (CLEAR_SEQUENCES.some((s) => stdOutput.includes(s))) {
          log('WORKER_RESET', {});
          for (let s of CLEAR_SEQUENCES) {
            stdOutput = stdOutput.replace(s, '');
          }
        }
        if (cmdProgram === 'tsc') {
          const errorMatch = stdOutput.match(/Found (\d+) error/);
          if (errorMatch) {
            if (errorMatch[1] === '0') {
              stdOutput = stdOutput.trim();
            }
          }
        }
        log('WORKER_MSG', {level: 'log', msg: stdOutput});
      }
      stdout && stdout.on('data', dataListener);
      stderr && stderr.on('data', dataListener);
      return workerPromise;
    },
  };
}

module.exports = runScriptPlugin;
