import {EventEmitter} from 'events';
import ansiEscapes from 'ansi-escapes';
import chalk from 'chalk';
import {DevScript} from '../config';

function getStateString(workerState) {
  if (workerState.state) {
    if (Array.isArray(workerState.state)) {
      return chalk[workerState.state[1]](workerState.state[0]);
    }
    return chalk.dim(workerState.state);
  }
  if (workerState.done) {
    return workerState.error ? chalk.red('FAILED') : chalk.green('DONE');
  }
  if (workerState.config.watch) {
    return chalk.dim('WATCHING');
  }
  return chalk.cyan('RUNNING');
}

const WORKER_BASE_STATE = {done: false, error: null, output: ''};

export function paint(bus: EventEmitter, registeredWorkers: [string, DevScript][]) {
  let consoleOutput = '';
  let hasBeenCleared = false;
  const allWorkerStates = {};

  for (const [workerId, config] of registeredWorkers) {
    allWorkerStates[workerId] = {...WORKER_BASE_STATE, config};
  }

  function repaint() {
    process.stdout.write(ansiEscapes.clearTerminal);
    process.stdout.write(`${chalk.bold('☶ Snowpack')}\n\n`);
    // Dashboard
    for (const [workerId, config] of registeredWorkers) {
      const workerState = allWorkerStates[workerId];
      const dotLength = 24 - workerId.length;
      const dots = ''.padEnd(dotLength, '.');
      const stateStr = getStateString(workerState);
      process.stdout.write(`  ${workerId}${chalk.dim(dots)}[${stateStr}]\n`);
    }
    process.stdout.write('\n');
    for (const [workerId, config] of registeredWorkers) {
      const workerState = allWorkerStates[workerId];
      if (workerState && workerState.output) {
        const chalkFn = Array.isArray(workerState.error) ? chalk.red.underline : chalk.underline;
        process.stdout.write(`${chalkFn.bold('▼ ' + workerId)}\n\n`);
        process.stdout.write(
          workerState.output
            ? '  ' + workerState.output.trim().replace(/\n/gm, '\n  ')
            : hasBeenCleared
            ? chalk.dim('  Output cleared.')
            : chalk.dim('  No output, yet.'),
        );
        process.stdout.write('\n\n');
      }
    }
    if (consoleOutput) {
      process.stdout.write(`${chalk.underline.bold('▼ Console')}\n`);
      process.stdout.write('  ' + consoleOutput.trim().replace(/\n/gm, '\n  '));
      process.stdout.write('\n\n');
    }
  }

  bus.on('WORKER_MSG', ({id, msg}) => {
    allWorkerStates[id].output += msg;
    repaint();
  });
  bus.on('WORKER_UPDATE', ({id, state}) => {
    allWorkerStates[id].state = state || allWorkerStates[id].state;
    repaint();
  });
  bus.on('WORKER_COMPLETE', ({id, error}) => {
    allWorkerStates[id].done = true;
    allWorkerStates[id].error = error;
    repaint();
  });
  bus.on('WORKER_RESET', ({id}) => {
    allWorkerStates[id] = {...WORKER_BASE_STATE, config: allWorkerStates[id].config};
    repaint();
  });
  bus.on('CONSOLE', ({level, args}) => {
    consoleOutput += `[${level}] ${args.join(' ')}\n`;
    repaint();
  });

  // const rl = readline.createInterface({
  //   input: process.stdin,
  //   output: process.stdout,
  // });
  // rl.on('line', (input) => {
  //   for (const [workerId, config] of registeredWorkers) {
  //     if (!allWorkerStates[workerId].done && !allWorkerStates[workerId].state) {
  //       allWorkerStates[workerId].output = '';
  //     }
  //   }
  //   hasBeenCleared = true;
  //   repaint();
  // });

  // unmountDashboard = render(<App bus={bus} registeredWorkers={registeredWorkers} />).unmount;
}
