const execa = require('execa');
const npmRunPath = require('npm-run-path');
const cwd = process.cwd();

function runScriptPlugin(_, {cmd, watch}) {
  const cmdProgram = cmd.split(' ')[0];
  const watchCmd = watch && watch.replace('$1', cmd);

  return {
    name: `run:${cmdProgram}`,
    async run({isDev, log}) {
      const workerPromise = execa.command(isDev ? watchCmd || cmd : cmd, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        cwd,
      });
      const {stdout, stderr} = workerPromise;
      stdout &&
        stdout.on('data', (b) => {
          let stdOutput = b.toString();
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
              } else {
                log('WORKER_UPDATE', {state: ['ERROR', 'red']});
              }
            }
          }
          log('WORKER_MSG', {level: 'log', msg: stdOutput});
        });
      stderr &&
        stderr.on('data', (b) => {
          log('WORKER_MSG', {level: 'error', msg: b.toString()});
        });
      return workerPromise;
    },
  };
}

module.exports = runScriptPlugin;
