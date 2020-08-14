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
        input: contents,
        cwd,
      });
      // If the command failed, fail the plugin as well.
      if (exitCode !== 0) {
        throw new Error(stderr || stdout);
      }
      // If the plugin output tp stderr, how it to the user.
      if (stderr) {
        throw new Error(stderr);
      }
      return {[output[0]]: stdout};
    },
  };
}

module.exports = buildScriptPlugin;
