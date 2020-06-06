import execa from 'execa';
import npmRunPath from 'npm-run-path';

import {BuildScript} from '../config';
import {MiddlewareContext} from '.';

interface RunLintAllOptions {
  context: MiddlewareContext;
  workerConfig: BuildScript;
}

export default function runLintAll({
  context: {
    commandOptions: {cwd},
    messageBus,
  },
  workerConfig: {id, cmd, watch},
}: RunLintAllOptions) {
  const workerPromise = execa.command(watch || cmd, {
    env: npmRunPath.env(),
    extendEnv: true,
    shell: true,
    cwd,
  });
  const {stdout, stderr} = workerPromise;
  stdout?.on('data', (b) => {
    let stdOutput = b.toString();
    if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
      messageBus.emit('WORKER_RESET', {id});
      stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
    }
    if (id.endsWith(':tsc')) {
      if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
        messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
      }
      if (/Watching for file changes./gm.test(stdOutput)) {
        messageBus.emit('WORKER_UPDATE', {id, state: 'WATCH'});
      }
      const errorMatch = stdOutput.match(/Found (\d+) error/);
      if (errorMatch && errorMatch[1] !== '0') {
        messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
      }
    }
    messageBus.emit('WORKER_MSG', {id, level: 'log', msg: stdOutput});
  });
  stderr?.on('data', (b) => {
    messageBus.emit('WORKER_MSG', {id, level: 'error', msg: b.toString()});
  });
  workerPromise.catch((err) => {
    messageBus.emit('WORKER_COMPLETE', {id, error: err});
  });
  workerPromise.then(() => {
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  });
}
