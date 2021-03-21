const execa = require('execa');
const {env} = require('npm-run-path');
const cwd = process.cwd();

function dataListener(chunk, log) {
  let stdOutput = chunk.toString();
  // In --watch mode, handle the "clear" character
  if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
    log('WORKER_RESET', {});
    stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
  }
  log('WORKER_MSG', {msg: stdOutput});
}

async function runNgc(args, log) {
  const {stdout, stderr} = await execa
    .command(`ngc ${args || '--project ./tsconfig.app.json'}`, {
      env: env(),
      extendEnv: true,
      windowsHide: false,
      cwd,
    })
    .catch((err) => {
      if (/ENOENT/.test(err.message)) {
        log('WORKER_MSG', {
          msg: 'WARN: "tsc" run failed. Is typescript installed in your project?',
        });
      }
      throw err;
    });

  stdout && stdout.on('data', (chunk) => dataListener(chunk, log));
  stderr && stderr.on('data', (chunk) => dataListener(chunk, log));
}

function angularPlugin(_, {args} = {}) {
  /**
   * @type {import('snowpack').SnowpackPlugin}
   */
  const plugin = {
    name: '@snowpack/plugin-angular',
    run({isDev, log}) {
      if (isDev) runNgc(args, log);

      const workerPromise = execa.command(
        `ngc ${args || '--project ./tsconfig.app.json'} ${isDev ? '--watch' : ''}`,
        {
          env: env(),
          extendEnv: true,
          windowsHide: false,
          cwd,
        },
      );
      const {stdout, stderr} = workerPromise;

      stdout && stdout.on('data', (chunk) => dataListener(chunk, log));
      stderr && stderr.on('data', (chunk) => dataListener(chunk, log));

      return workerPromise.catch((err) => {
        if (/ENOENT/.test(err.message)) {
          log('WORKER_MSG', {
            msg: 'WARN: "ngc" run failed. Is @angular/compiler-cli installed in your project?',
          });
        }
        throw err;
      });
    },
    transform({contents, fileExt, isDev}) {
      if (isDev || fileExt.trim() !== '.js' || !contents.trim()) return contents;

      const {buildOptimizer} = require('@angular-devkit/build-optimizer');

      const transpiledContent = buildOptimizer({content: contents}).content;

      return transpiledContent || contents;
    },
  };

  return plugin;
}

module.exports = angularPlugin;
