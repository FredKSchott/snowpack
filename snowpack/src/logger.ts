import * as colors from 'kleur/colors';
import {LoggerLevel, LoggerEvent, LoggerOptions} from './types';

export interface LogRecord {
  val: string;
  count: number;
}

const levels: Record<LoggerLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90,
};

/** Custom logger heavily-inspired by https://github.com/pinojs/pino with extra features like log retentian */
class SnowpackLogger {
  /** set the log level (can be changed after init) */
  public level: LoggerLevel = 'info';
  /** configure maximum number of logs to keep (default: 500) */
  public logCount = 500;

  private history: {val: string; count: number}[] = []; // this is immutable; must be accessed with Logger.getHistory()
  private callbacks: Record<LoggerEvent, (message: string) => void> = {
    debug: (message: string) => {
      console.log(message);
    },
    info: (message: string) => {
      console.log(message);
    },
    warn: (message: string) => {
      console.warn(message);
    },
    error: (message: string) => {
      console.error(message);
    },
  };

  private log({
    level,
    name,
    message,
    task,
  }: {
    level: LoggerEvent;
    name: string;
    message: string;
    task?: Function;
  }) {
    // test if this level is enabled or not
    if (levels[this.level] > levels[level]) {
      return; // do nothing
    }

    // format
    let text = message;
    if (level === 'warn') text = colors.yellow(text);
    if (level === 'error') text = colors.red(text);
    const time = new Date();
    const log = `${colors.dim(
      `[${String(time.getHours() + 1).padStart(2, '0')}:${String(time.getMinutes() + 1).padStart(
        2,
        '0',
      )}:${String(time.getSeconds()).padStart(2, '0')}]`,
    )} ${colors.dim(`[${name}]`)} ${text}`;

    // add to log history and remove old logs to keep memory low
    const lastHistoryItem = this.history[this.history.length - 1];
    if (lastHistoryItem && lastHistoryItem.val === log) {
      lastHistoryItem.count++;
    } else {
      this.history.push({val: log, count: 1});
    }
    while (this.history.length > this.logCount) {
      this.history.shift();
    }

    // log
    if (typeof this.callbacks[level] === 'function') {
      this.callbacks[level](log);
    } else {
      throw new Error(`No logging method defined for ${level}`);
    }

    // logger takes a possibly processor-intensive task, and only
    // processes it when this log level is enabled
    task && task(this);
  }

  /** emit messages only visible when --debug is passed */
  public debug(message: string, options?: LoggerOptions): void {
    const name = (options && options.name) || 'snowpack';
    this.log({level: 'debug', name, message, task: options?.task});
  }

  /** emit general info */
  public info(message: string, options?: LoggerOptions): void {
    const name = (options && options.name) || 'snowpack';
    this.log({level: 'info', name, message, task: options?.task});
  }

  /** emit non-fatal warnings */
  public warn(message: string, options?: LoggerOptions): void {
    const name = (options && options.name) || 'snowpack';
    this.log({level: 'warn', name, message, task: options?.task});
  }

  /** emit critical error messages */
  public error(message: string, options?: LoggerOptions): void {
    const name = (options && options.name) || 'snowpack';
    this.log({level: 'error', name, message, task: options?.task});
  }

  /** get full logging history */
  public getHistory(): ReadonlyArray<LogRecord> {
    return this.history;
  }

  /** listen for events */
  public on(event: LoggerEvent, callback: (message: string) => void) {
    this.callbacks[event] = callback;
  }
}

/** export one logger to rest of app */
export const logger = new SnowpackLogger();
