import * as colors from 'kleur/colors';
import pino from 'pino';

const NAME_REGEX = /^\[[^\]]+\s*\]/; // select [somename] at beginning of line

const LEVEL = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
};

/** http://getpino.io/#/docs/pretty */
function prettifier() {
  return (inputData: pino.LogDescriptor) => {
    // if the log starts with brackets, use that (e.g. [@snowpack/plugin-babel]); otherwise, use [snowpack]
    const nameMatch = inputData.msg.match(NAME_REGEX);
    let name = (nameMatch && nameMatch[0]) || '[snowpack]';
    let msg = `${colors.dim(name.trim())} ${inputData.msg.replace(NAME_REGEX, '')}\n`; // add newline at end

    if (inputData.level === LEVEL.ERROR || inputData.level === LEVEL.FATAL) msg = colors.red(msg);
    if (inputData.level === LEVEL.WARN) msg = colors.yellow(msg);

    return msg;
  };
}

/** export one Pino logger to rest of app, a tiny logging library */
export default pino({
  name: 'snowpack',
  prettyPrint: {suppressFlushSyncWarning: true},
  prettifier,
});
