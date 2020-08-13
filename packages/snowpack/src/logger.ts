import * as colors from 'kleur/colors';
import pino, {LoggerOptions} from 'pino';

const LEVEL = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
};

/** http://getpino.io/#/docs/pretty */
export function prettifier(options: LoggerOptions) {
  return (inputData: pino.LogDescriptor) => {
    // if the log starts with brackets, use that (e.g. [@snowpack/plugin-babel]); otherwise, use [snowpack]
    const name = options.name ? `[${options.name}]` : '[snowpack]';
    let msg = `${colors.dim(name)} ${inputData.msg}\n`; // add newline at end

    if (inputData.level === LEVEL.ERROR || inputData.level === LEVEL.FATAL) msg = colors.red(msg);
    if (inputData.level === LEVEL.WARN) msg = colors.yellow(msg);

    return msg;
  };
}

/** use Pino, a tiny logging library */
export default function createLogger(opts: pino.LoggerOptions = {}) {
  return pino({
    ...opts,
    name: opts.name || 'snowpack',
    prettyPrint: {suppressFlushSyncWarning: true},
    prettifier,
  });
}
