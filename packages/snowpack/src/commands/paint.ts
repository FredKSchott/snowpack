import detectPort from 'detect-port';
import {EventEmitter} from 'events';
import * as colors from 'kleur/colors';
import path from 'path';
import readline from 'readline';
const cwd = process.cwd();

export const paintEvent = {
  BUILD_FILE: 'BUILD_FILE',
  ERROR: 'ERROR',
  LOAD_ERROR: 'LOAD_ERROR',
  INFO: 'INFO',
  SERVER_RESPONSE: 'SERVER_RESPONSE',
  SERVER_START: 'SERVER_START',
  SUCCESS: 'SUCCESS',
  WARN: 'WARN',
  WORKER_COMPLETE: 'WORKER_COMPLETE',
  WORKER_MSG: 'WORKER_MSG',
  WORKER_RESET: 'WORKER_RESET',
  WORKER_UPDATE: 'WORKER_UPDATE',
};

let consoleOutput: string[] = [];
type DevServerState = 'READY' | 'LOADING' | 'ERROR';
const STATE_DISPLAY: Record<DevServerState, string> = {
  READY: colors.bgGreen(colors.black(' READY ')),
  LOADING: colors.bgYellow(colors.black(' LOADING ')),
  ERROR: colors.bgRed(colors.black(' ERROR ')),
};
const errorMap: Record<string, boolean> = {};
let devServerState: DevServerState = 'LOADING';

const NO_COLOR_ENABLED = process.env.FORCE_COLOR === '0' || process.env.NO_COLOR;

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
      console.error(
        colors.red(
          `✘ Port ${colors.bold(defaultPort)} not available. Use ${colors.bold(
            '--port',
          )} to specify a different port.`,
        ),
      );
      console.error();
      process.exit(1);
    }
  }
  return bestAvailablePort;
}

interface WorkerState {
  done: boolean;
  state: null | [string, string];
  error: null | Error;
  output: string;
}
const WORKER_BASE_STATE: WorkerState = {done: false, error: null, state: null, output: ''};

export function paint(bus: EventEmitter, plugins: string[]) {
  let port: number;
  let hostname: string;
  let protocol = '';
  let startTimeMs: number;
  let ips: string[] = [];
  const allWorkerStates: Record<string, WorkerState> = {};
  const allFileBuilds = new Set<string>();

  for (const plugin of plugins) {
    allWorkerStates[plugin] = {...WORKER_BASE_STATE};
  }

  function setupWorker(id: string) {
    if (!allWorkerStates[id]) {
      allWorkerStates[id] = {...WORKER_BASE_STATE};
    }
  }

  function repaint() {
    // Clear Page
    process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');

    // Print the Console
    if (consoleOutput.length) {
      process.stdout.write(`${colors.underline(colors.bold('▼ Console'))}\n\n`);
      process.stdout.write(consoleOutput.join('\n'));
      process.stdout.write('\n\n');
    }

    // Dashboard
    const isServerStarted = startTimeMs > 0 && port > 0 && protocol;
    if (isServerStarted) {
      if (allFileBuilds.size > 0) {
        process.stdout.write(colors.dim(` Building…\n`));
      }
      process.stdout.write(
        `${colors.bgBlue(colors.white(' SNOWPACK '))}${
          STATE_DISPLAY[devServerState]
        } ${hostname}:${port} › ${ips[0]}`,
      );
    } else {
      process.stdout.write(
        `${colors.bgBlue(colors.white(' SNOWPACK '))}${STATE_DISPLAY[devServerState]}`,
      );
    }
  }

  bus.on(paintEvent.BUILD_FILE, ({id, isBuilding}) => {
    if (isBuilding) {
      allFileBuilds.add(path.relative(cwd, id));
    } else {
      allFileBuilds.delete(path.relative(cwd, id));
    }
    repaint();
  });
  bus.on(paintEvent.WORKER_MSG, ({id, msg}) => {
    setupWorker(id);
    allWorkerStates[id].output += msg;
    repaint();
  });
  bus.on(paintEvent.WORKER_UPDATE, ({id, state}) => {
    if (typeof state !== undefined) {
      setupWorker(id);
      allWorkerStates[id].state = state;
    }
    repaint();
  });
  bus.on(paintEvent.WORKER_COMPLETE, ({id, error}) => {
    allWorkerStates[id].state = ['DONE', 'green'];
    allWorkerStates[id].done = true;
    allWorkerStates[id].error = allWorkerStates[id].error || error;
    repaint();
  });
  bus.on(paintEvent.WORKER_RESET, ({id}) => {
    allWorkerStates[id] = {...WORKER_BASE_STATE};
    repaint();
  });
  bus.on(paintEvent.INFO, ({id = 'snowpack', msg}) => {
    const formatted = NO_COLOR_ENABLED ? `[${id}] ${msg}` : `${colors.dim(`[${id}]`)} ${msg}`;
    consoleOutput.push(formatted);
    repaint();
  });
  bus.on(paintEvent.WARN, ({id = 'snowpack', msg}) => {
    const formatted = NO_COLOR_ENABLED
      ? `[${id}] ${msg}`
      : `${colors.dim(`[${id}]`)} ${colors.yellow(`${msg}`)}`;
    consoleOutput.push(formatted);
    repaint();
  });
  bus.on(paintEvent.ERROR, ({id = 'snowpack', msg}) => {
    errorMap[id] = true;
    devServerState = 'ERROR'; // mark server state as erred until all errors resolved
    const formatted = NO_COLOR_ENABLED
      ? `[${id}] ${msg}`
      : `${colors.dim(`[${id}]`)} ${colors.red(`${msg}`)}`;
    consoleOutput.push(formatted);
    repaint();
  });
  bus.on(paintEvent.SUCCESS, ({id}) => {
    if (id && errorMap[id]) {
      delete errorMap[id];
    }
    if (!Object.keys(errorMap).length) {
      devServerState = 'READY'; // if no errors left, mark dev server as error-free
    }
  });
  bus.on(paintEvent.SERVER_START, (info) => {
    devServerState = 'READY';
    startTimeMs = info.startTimeMs;
    hostname = info.hostname;
    port = info.port;
    protocol = info.protocol;
    ips = info.ips;
    repaint();
  });

  repaint();
}
