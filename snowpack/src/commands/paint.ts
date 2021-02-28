import detectPort from 'detect-port';
import {EventEmitter} from 'events';
import * as colors from 'kleur/colors';
import util from 'util';
import path from 'path';
import readline from 'readline';
import {logger, LogRecord} from '../logger';
import {SnowpackConfig} from '../types';
import spinners from 'cli-spinners';

const IS_FILE_CHANGED_MESSAGE = /File changed\.\.\./;

/** Convert a logger's history into the proper dev console format. */
function summarizeHistory(history: readonly LogRecord[]): string {
  // Note: history array can get long over time. Performance matters here!
  return history.reduce((historyString, record) => {
    let line;
    // We want to summarize common repeat "file changed" events to reduce noise.
    // All other logs should be included verbatim, with all repeats added.
    if (record.count === 1) {
      line = record.val;
    } else if (IS_FILE_CHANGED_MESSAGE.test(record.val)) {
      line = record.val + colors.green(` [x${record.count}]`);
    } else {
      line = Array(record.count).fill(record.val).join('\n');
    }
    // Note: this includes an extra '\n' character at the start.
    // Fine for our use-case, but be aware.
    return historyString + '\n' + line;
  }, '');
}
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

interface ServerInfo {
  port: number;
  hostname: string;
  protocol: string;
  startTimeMs: number;
  remoteIp?: string;
}

interface WorkerState {
  done: boolean;
  error: null | Error;
  output: string;
}
const WORKER_BASE_STATE: WorkerState = {done: false, error: null, output: ''};

export function startDashboard(bus: EventEmitter, config: SnowpackConfig) {
  const allWorkerStates: Record<string, WorkerState> = {};
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
    let dashboardMsg = '';
    // Header
    dashboardMsg +=
      '\n' + colors.cyan(`${spinners.dots.frames[spinnerFrame]} watching for file changes...`);
    // Worker Dashboards
    // for (const [script, workerState] of Object.entries(allWorkerStates)) {
    //   if (!workerState.output) {
    //     continue;
    //   }
    //   const colorsFn = Array.isArray(workerState.error) ? colors.red : colors.reset;
    //   dashboardMsg += `${colorsFn(colors.underline(colors.bold('▼ ' + script)))}\n\n`;
    //   dashboardMsg += '  ' + workerState.output.trim().replace(/\n/gm, '\n  ');
    //   dashboardMsg += '\n\n';
    // }

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
      counter = ` (x${lastMsgCount})`;
    } else {
      lastMsgCount = 1;
    }
    return msg + counter;
  }

  function cleanTimestamp(msg: string): string {
    return msg.replace(/^.*\]/, '');
  }

  // bus.on(paintEvent.BUILD_FILE, ({id, isBuilding}) => {
  //   if (isBuilding) {
  //     allFileBuilds.add(path.relative(config.root, id));
  //   } else {
  //     allFileBuilds.delete(path.relative(config.root, id));
  //   }
  //   repaint();
  // });
  bus.on(paintEvent.WORKER_MSG, ({id, msg}) => {
    const cleanedMsg = msg.trim();
    if (!cleanedMsg) {
      return;
    }
    for (const individualMsg of cleanedMsg.split('\n')) {
      logger.info(individualMsg, {name: id});
    }
  });
  // bus.on(paintEvent.WORKER_COMPLETE, ({id, error}) => {
  //   allWorkerStates[id].done = true;
  //   allWorkerStates[id].error = allWorkerStates[id].error || error;
  //   repaint();
  // });
  // bus.on(paintEvent.WORKER_RESET, ({id}) => {
  //   allWorkerStates[id] = {...WORKER_BASE_STATE};
  //   repaint();
  // });
  // bus.on(paintEvent.SERVER_START, (info: ServerInfo) => {
  //   serverInfo = info;
  // });

  // // replace logging behavior with repaint (note: messages are retrieved later, with logger.getHistory())
  let lines = 0;
  logger.on('debug', (msg) => {
    clearDashboard(lines, msg);
    process.stdout.write(addTimestamp(msg));
    lastMsg = cleanTimestamp(msg);
    process.stdout.write('\n');
    const result = paintDashboard();
    process.stdout.write(result.msg);
    lines = result.lines;
  });
  logger.on('info', (msg) => {
    clearDashboard(lines, msg);
    process.stdout.write(addTimestamp(msg));
    lastMsg = cleanTimestamp(msg);
    process.stdout.write('\n');
    const result = paintDashboard();
    process.stdout.write(result.msg);
    lines = result.lines;
  });
  logger.on('warn', (msg) => {
    clearDashboard(lines, msg);
    process.stdout.write(addTimestamp(msg));
    lastMsg = cleanTimestamp(msg);
    process.stdout.write('\n');
    const result = paintDashboard();
    process.stdout.write(result.msg);
    lines = result.lines;
  });
  logger.on('error', (msg) => {
    clearDashboard(lines, msg);
    process.stdout.write(addTimestamp(msg));
    lastMsg = cleanTimestamp(msg);
    process.stdout.write('\n');
    const result = paintDashboard();
    process.stdout.write(result.msg);
    lines = result.lines;
  });

  setInterval(() => {
    spinnerFrame = (spinnerFrame + 1) % spinners.dots.frames.length;
    clearDashboard(lines);
    const result = paintDashboard();
    process.stdout.write(result.msg);
    lines = result.lines;
  }, 1000);
  logger.debug(`dashboard started`);
  // repaint();
}
