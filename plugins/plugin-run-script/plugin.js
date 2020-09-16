const execa = require('execa');
const npmRunPath = require('npm-run-path');
const cwd = process.cwd();

function runScriptPlugin(_, {cmd, watch, output}) {
  const [cmdProgram] = cmd.split(' ');
  const watchCmd = watch && watch.replace('$1', cmd);

  return {
    name: cmdProgram,
    async run({isDev, log}) {
      const workerPromise = execa.command(isDev ? watchCmd || cmd : cmd, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        windowsHide: false,
        cwd,
      });
      const {stdout, stderr} = workerPromise;
      function dataListener(chunk) {
        let stdOutput = chunk.toString();
        if (output === 'stream') {
          log('CONSOLE_INFO', {id: cmdProgram, msg: stdOutput});
          return;
        }
        if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
          log('WORKER_RESET', {});
          log('WORKER_UPDATE', {state: ['RUNNING', 'yellow']});
          stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
        }
        if (cmdProgram === 'tsc') {
          if (/Watching for file changes./gm.test(stdOutput)) {
            log('WORKER_UPDATE', {state: ['RUNNING', 'yellow']});
          }
          const errorMatch = stdOutput.match(/Found (\d+) error/);
          if (errorMatch) {
            if (errorMatch[1] === '0') {
              log('WORKER_UPDATE', {state: ['OK', 'green']});
              stdOutput = stdOutput.trim();
            } else {
              log('WORKER_UPDATE', {state: ['ERROR', 'red']});
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
