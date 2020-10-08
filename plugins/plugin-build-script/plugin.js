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
    async load({filePath}) {
      const cmdWithFile = cmd.replace('$FILE', filePath);
      const contents = await fs.readFile(filePath, 'utf-8');
      const {stdout, stderr, exitCode} = await execa.command(cmdWithFile, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        windowsHide: false,
        input: contents,
        cwd,
      });
      // If the command failed, fail the plugin as well.
      if (exitCode !== 0) {
        throw new Error(stderr || stdout);
      }
      // If the plugin outputs to stderr, show it to the user.
      if (stderr) {
        console.warn(stderr);
      }
      return {[output[0]]: stdout};
    },
  };
}

module.exports = buildScriptPlugin;
