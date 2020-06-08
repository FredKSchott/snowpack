import chalk from 'chalk';
import {EventEmitter} from 'events';
import readline from 'readline';
import util from 'util';
import {BuildScript} from '../config';
import {isYarn} from '../util';
const cwd = process.cwd();

function getStateString(workerState: any, isWatch: boolean): [chalk.ChalkFunction, string] {
  if (workerState.state) {
    if (Array.isArray(workerState.state)) {
      return [chalk[workerState.state[1]], workerState.state[0]];
    }
    return [chalk.dim, workerState.state];
  }
  if (workerState.done) {
    return workerState.error ? [chalk.red, 'FAIL'] : [chalk.green, 'DONE'];
  }
  if (isWatch) {
    if (workerState.config.watch) {
      return [chalk.dim, 'WATCH'];
    }
  }
  return [chalk.dim, 'READY'];
}

const WORKER_BASE_STATE = {done: false, error: null, output: ''};

export function paint(
  bus: EventEmitter,
  registeredWorkers: BuildScript[],
  buildMode: {dest: string} | undefined,
  devMode:
    | {
        protocol: string;
        port: number;
        ips: string[];
        startTimeMs: number;
        addPackage: (pkgName: string) => void;
      }
    | undefined,
) {
  let consoleOutput = '';
  let installOutput = '';
  let isInstalling = false;
  let hasBeenCleared = false;
  let missingWebModule: null | {id: string; spec: string; pkgName: string} = null;
  const allWorkerStates: any = {};

  for (const config of registeredWorkers) {
    allWorkerStates[config.id] = {...WORKER_BASE_STATE, config};
  }

  function repaint() {
    process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
    process.stdout.write(`${chalk.bold('Snowpack')}\n\n`);
    // Dashboard
    if (devMode) {
      process.stdout.write(
        `  ${chalk.bold.cyan(`${devMode.protocol}//localhost:${devMode.port}`)}`,
      );
      for (const ip of devMode.ips) {
        process.stdout.write(
          `${chalk.cyan(` > `)}${chalk.bold.cyan(`${devMode.protocol}//${ip}:${devMode.port}`)}`,
        );
      }
      process.stdout.write('\n' + chalk.dim(`  Server started in ${devMode.startTimeMs}ms.\n\n`));
    }
    if (buildMode) {
      process.stdout.write('  ' + chalk.bold.cyan(buildMode.dest));
      process.stdout.write(chalk.dim(` Building your application...\n\n`));
    }

    for (const config of registeredWorkers) {
      if (devMode && config.type === 'bundle') {
        continue;
      }
      const workerState = allWorkerStates[config.id];
      const dotLength = 24 - config.id.length;
      const dots = chalk.dim(''.padEnd(dotLength, '.'));
      const [fmt, stateString] = getStateString(workerState, !!devMode);
      const spacer = ' '; //.padEnd(8 - stateString.length);
      let cmdMsg = `${config.plugin && config.cmd[0] !== '(' ? '(plugin) ' : ''}${config.cmd}`;
      if (cmdMsg.length > 52) {
        cmdMsg = cmdMsg.substr(0, 52) + '...';
      }
      const cmdStr = stateString === 'FAIL' ? chalk.red(cmdMsg) : chalk.dim(cmdMsg);
      process.stdout.write(`  ${config.id}${dots}[${fmt(stateString)}]${spacer}${cmdStr}\n`);
    }
    process.stdout.write('\n');
    if (isInstalling) {
      process.stdout.write(`${chalk.underline.bold('▼ snowpack install')}\n\n`);
      process.stdout.write('  ' + installOutput.trim().replace(/\n/gm, '\n  '));
      process.stdout.write('\n\n');
      return;
    }
    if (missingWebModule) {
      const {id, pkgName, spec} = missingWebModule;
      process.stdout.write(`${chalk.red.underline.bold('▼ Snowpack')}\n\n`);
      if (devMode) {
        process.stdout.write(`  Package ${chalk.bold(pkgName)} not found!\n`);
        process.stdout.write(chalk.dim(`  in ${id}`));
        process.stdout.write(`\n\n`);
        process.stdout.write(
          `  ${chalk.bold('Press Enter')} to automatically run ${chalk.bold(
            isYarn(cwd) ? `yarn add ${pkgName}` : `npm install --save ${pkgName}`,
          )}.\n`,
        );
        process.stdout.write(`  Or, Exit Snowpack and install manually to continue.\n`);
      } else {
        process.stdout.write(`  Dependency ${chalk.bold(spec)} not found!\n\n`);
        // process.stdout.write(
        //   `  Run ${chalk.bold('snowpack install')} to install all required dependencies.\n\n`,
        // );
        process.exit(1);
      }
      return;
    }
    for (const config of registeredWorkers) {
      const workerState = allWorkerStates[config.id];
      if (workerState && workerState.output) {
        const chalkFn = Array.isArray(workerState.error) ? chalk.red : chalk;
        process.stdout.write(`${chalkFn.underline.bold('▼ ' + config.id)}\n\n`);
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
      process.stdout.write(`${chalk.underline.bold('▼ Console')}\n\n`);
      process.stdout.write(
        consoleOutput
          ? '  ' + consoleOutput.trim().replace(/\n/gm, '\n  ')
          : hasBeenCleared
          ? chalk.dim('  Output cleared.')
          : chalk.dim('  No output, yet.'),
      );
      process.stdout.write('\n\n');
    }
    const overallStatus: any = Object.values(allWorkerStates).reduce(
      (result: any, {done, error}: any) => {
        return {
          done: result.done && done,
          error: result.error || error,
        };
      },
    );
    if (overallStatus.error) {
      process.stdout.write(`${chalk.underline.red.bold('▼ Result')}\n\n`);
      process.stdout.write('  ⚠️  Finished, with errors.');
      process.stdout.write('\n\n');
      process.exit(1);
    } else if (overallStatus.done) {
      process.stdout.write(`${chalk.underline.green.bold('▶ Build Complete!')}\n\n`);
    }
  }

  bus.on('WORKER_MSG', ({id, msg}) => {
    allWorkerStates[id].output += msg;
    repaint();
  });
  bus.on('WORKER_UPDATE', ({id, state}) => {
    if (typeof state !== undefined) {
      allWorkerStates[id].state = state;
    }
    repaint();
  });
  bus.on('WORKER_COMPLETE', ({id, error}) => {
    allWorkerStates[id].state = null;
    allWorkerStates[id].done = true;
    allWorkerStates[id].error = allWorkerStates[id].error || error;
    repaint();
  });
  bus.on('WORKER_RESET', ({id}) => {
    allWorkerStates[id] = {...WORKER_BASE_STATE, config: allWorkerStates[id].config};
    repaint();
  });
  bus.on('CONSOLE', ({level, args}) => {
    if (isInstalling) {
      const msg = util.format.apply(util, args);
      if (!msg.startsWith('[404] ')) {
        installOutput += msg;
      }
    } else {
      consoleOutput += `[${level}] ${util.format.apply(util, args)}\n`;
    }
    repaint();
  });
  bus.on('NEW_SESSION', () => {
    if (consoleOutput) {
      consoleOutput = ``;
      hasBeenCleared = true;
    }
    // Reset all per-file build scripts
    for (const config of registeredWorkers) {
      if (config.type === 'build') {
        allWorkerStates[config.id] = {
          ...WORKER_BASE_STATE,
          config: allWorkerStates[config.id].config,
        };
      }
    }
    repaint();
  });
  bus.on('INSTALLING', () => {
    isInstalling = true;
    installOutput = '';
    repaint();
  });
  bus.on('INSTALL_COMPLETE', () => {
    setTimeout(() => {
      missingWebModule = null;
      isInstalling = false;
      installOutput = '';
      consoleOutput = ``;
      hasBeenCleared = true;
      repaint();
    }, 2000);
  });
  bus.on('MISSING_WEB_MODULE', ({id, data}) => {
    if (!missingWebModule && data) {
      missingWebModule = {id, ...data};
    }
    if (missingWebModule && missingWebModule.id === id) {
      if (!data) {
        missingWebModule = null;
      } else {
        missingWebModule = {id, ...data};
      }
    }
    repaint();
  });

  if (devMode) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('line', (input) => {
      if (!missingWebModule) {
        return;
      }
      devMode.addPackage(missingWebModule.pkgName);
      repaint();
    });
    rl.on('close', function () {
      process.exit(0);
    });
  }

  repaint();
}
