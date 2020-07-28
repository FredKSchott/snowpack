const execa = require('execa');
const npmRunPath = require('npm-run-path');
const {promises: fs} = require('fs');

const cwd = process.cwd();

function buildScriptPlugin(_, {input, output, cmd}) {
  if (output.length !== 1) {
    throw new Error('Requires one output.');
  }
  return {
    name: `build:${cmd.split(' ')[0]}`,
    resolve: {
      input: input,
      output: output,
    },
    async load({filePath, log}) {
      const cmdWithFile = cmd.replace('$FILE', filePath);
      const contents = await fs.readFile(filePath, 'utf-8');
      try {
        const {stdout, stderr} = await execa.command(cmdWithFile, {
          env: npmRunPath.env(),
          extendEnv: true,
          shell: true,
          input: contents,
          cwd,
        });
        if (stderr) {
          log('WORKER_MSG', {level: 'warn', msg: stderr});
        }
        return {[output[0]]: stdout};
      } catch (err) {
        log('WORKER_MSG', {level: 'error', msg: err.stderr});
        log('WORKER_UPDATE', {state: ['ERROR', 'red']});
        return null;
      }
    },
  };
}

module.exports = buildScriptPlugin;
