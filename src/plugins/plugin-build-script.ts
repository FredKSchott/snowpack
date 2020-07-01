import execa from 'execa';
import npmRunPath from 'npm-run-path';
const cwd = process.cwd();

export function buildScriptPlugin({
  input,
  output,
  cmd,
}: {
  input: string[];
  output: string[];
  cmd: string;
}) {
  if (output.length !== 1) {
    throw new Error('Requires one output.');
  }
  return {
    name: `build:${cmd.split(' ')[0]}`,
    input: input,
    output: output,
    async build({contents, filePath, log}) {
      const cmdWithFile = cmd.replace('$FILE', filePath);
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
