import spinners from 'cli-spinners';
import detectPort from 'detect-port';
import {EventEmitter} from 'events';
import * as colors from 'kleur/colors';
import readline from 'readline';
import util from 'util';
import {logger} from '../logger';
import {SnowpackConfig} from '../types';

export const paintEvent = {
  BUILD_FILE: 'BUILD_FILE',
  LOAD_ERROR: 'LOAD_ERROR',
  SERVER_START: 'SERVER_START',
  WORKER_COMPLETE: 'WORKER_COMPLETE',
  WORKER_MSG: 'WORKER_MSG',
  WORKER_RESET: 'WORKER_RESET',
};

/**
 * Get the actual port, based on the `defaultPort`.
 * If the default port was not available, then we'll prompt the user if its okay
 * to use the next available port.
 */
export async function getPort(defaultPort: number): Promise<number> {
  const bestAvailablePort = await detectPort(defaultPort);
  if (defaultPort !== bestAvailablePort) {
    let useNextPort: boolean = false;
    if (process.stdout.isTTY) {
      const rl = readline.createInterface({input: process.stdin, output: process.stdout});
      useNextPort = await new Promise((resolve) => {
        rl.question(
          colors.yellow(
            `! Port ${colors.bold(defaultPort)} not available. Run on port ${colors.bold(
              bestAvailablePort,
            )} instead? (Y/n) `,
          ),
          (answer) => {
            resolve(!/^no?$/i.test(answer));
          },
        );
      });
      rl.close();
    }
    if (!useNextPort) {
      logger.error(
        `✘ Port ${colors.bold(defaultPort)} not available. Use ${colors.bold(
          '--port',
        )} to specify a different port.`,
      );
      process.exit(1);
    }
  }
  return bestAvailablePort;
}

export function startDashboard(bus: EventEmitter, _config: SnowpackConfig) {
  let spinnerFrame = 0;

  // "dashboard": Pipe console methods to the logger, and then start the dashboard.
  logger.debug(`attaching console.log listeners`);
  console.log = (...args: [any, ...any[]]) => {
    logger.info(util.format(...args));
  };
  console.warn = (...args: [any, ...any[]]) => {
    logger.warn(util.format(...args));
  };
  console.error = (...args: [any, ...any[]]) => {
    logger.error(util.format(...args));
  };

  function paintDashboard() {
    let dashboardMsg = colors.cyan(
      `${spinners.dots.frames[spinnerFrame]} watching for file changes...`,
    );
    const lines = dashboardMsg.split('\n').length;
    return {msg: dashboardMsg, lines};
  }

  function clearDashboard(num, msg?) {
    // Clear Info Line
    while (num > 0) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.moveCursor(0, -1);
      num--;
    }
    if (!msg || cleanTimestamp(msg) !== lastMsg) {
      process.stdout.moveCursor(0, 1);
    }
  }

  let lastMsg: string = '\0';
  let lastMsgCount = 1;
  function addTimestamp(msg: string): string {
    let counter = '';
    if (cleanTimestamp(msg) === lastMsg) {
      lastMsgCount++;
      counter = colors.yellow(` (x${lastMsgCount})`);
    } else {
      lastMsgCount = 1;
    }
    return msg + counter;
  }

  function cleanTimestamp(msg: string): string {
    return msg.replace(/^.*\]/, '');
  }

  bus.on(paintEvent.WORKER_MSG, ({id, msg}) => {
    const cleanedMsg = msg.trim();
    if (!cleanedMsg) {
      return;
    }
    for (const individualMsg of cleanedMsg.split('\n')) {
      logger.info(individualMsg, {name: id});
    }
  });

  let currentDashboardHeight = 1;

  function onLog(msg: string) {
    clearDashboard(currentDashboardHeight, msg);
    process.stdout.write(addTimestamp(msg));
    lastMsg = cleanTimestamp(msg);
    process.stdout.write('\n');
    const result = paintDashboard();
    process.stdout.write(result.msg);
    currentDashboardHeight = result.lines;
  }
  logger.on('debug', onLog);
  logger.on('info', onLog);
  logger.on('warn', onLog);
  logger.on('error', onLog);

  setInterval(() => {
    spinnerFrame = (spinnerFrame + 1) % spinners.dots.frames.length;
    clearDashboard(currentDashboardHeight);
    const result = paintDashboard();
    process.stdout.write(result.msg);
    currentDashboardHeight = result.lines;
  }, 1000);

  logger.debug(`dashboard started`);
}
