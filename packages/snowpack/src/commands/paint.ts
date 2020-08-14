import detectPort from 'detect-port';
import {EventEmitter} from 'events';
import * as colors from 'kleur/colors';
import path from 'path';
import readline from 'readline';
import logger from '../logger';

const cwd = process.cwd();

export const paintEvent = {
  BUILD_FILE: 'BUILD_FILE',
  LOAD_ERROR: 'LOAD_ERROR',
  SERVER_RESPONSE: 'SERVER_RESPONSE',
  SERVER_START: 'SERVER_START',
  WORKER_COMPLETE: 'WORKER_COMPLETE',
  WORKER_MSG: 'WORKER_MSG',
  WORKER_RESET: 'WORKER_RESET',
  WORKER_UPDATE: 'WORKER_UPDATE',
};

const MAX_CONSOLE_LENGTH = 500;
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
    // Header
    process.stdout.write(`${colors.bold(`snowpack`)}\n\n`);
    // Server Stats
    const isServerStarted = startTimeMs > 0 && port > 0 && protocol;
    if (isServerStarted) {
      process.stdout.write(`  ${colors.bold(colors.cyan(`${protocol}//${hostname}:${port}`))}`);
      for (const ip of ips) {
        process.stdout.write(
          `${colors.cyan(` • `)}${colors.bold(colors.cyan(`${protocol}//${ip}:${port}`))}`,
        );
      }
      process.stdout.write('\n');
      process.stdout.write(
        colors.dim(
          startTimeMs < 1000 ? `  Server started in ${startTimeMs}ms.` : `  Server started.`, // Not to hide slow startup times, but likely there were extraneous factors (prompts, etc.) where the speed isn’t accurate
        ),
      );
      if (allFileBuilds.size > 0) {
        process.stdout.write(colors.dim(` Building...`));
      }
      process.stdout.write('\n\n');
    } else {
      process.stdout.write(colors.dim(`  Server starting…`) + '\n\n');
    }
    // Console Output
    let history = logger.getHistory();
    if (history.length > MAX_CONSOLE_LENGTH) {
      history = [
        colors.dim('<Previous messages trimmed>'),
        ...history.slice(history.length - MAX_CONSOLE_LENGTH),
      ];
    }
    if (history.length) {
      process.stdout.write(`${colors.underline(colors.bold('▼ Console'))}\n\n`);
      process.stdout.write(history.join('\n'));
      process.stdout.write('\n\n');
    }
    // Worker Dashboards
    for (const [script, workerState] of Object.entries(allWorkerStates)) {
      if (!workerState.output) {
        continue;
      }
      const colorsFn = Array.isArray(workerState.error) ? colors.red : colors.reset;
      process.stdout.write(`${colorsFn(colors.underline(colors.bold('▼ ' + script)))}\n\n`);
      process.stdout.write('  ' + workerState.output.trim().replace(/\n/gm, '\n  '));
      process.stdout.write('\n\n');
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
  bus.on(paintEvent.SERVER_START, (info) => {
    startTimeMs = info.startTimeMs;
    hostname = info.hostname;
    port = info.port;
    protocol = info.protocol;
    ips = info.ips;
    repaint();
  });

  logger.on('debug', () => {
    repaint();
  });
  logger.on('info', () => {
    repaint();
  });
  logger.on('warn', () => {
    repaint();
  });
  logger.on('error', () => {
    repaint();
  });

  repaint();
}
