import * as colors from 'kleur/colors';
import path from 'path';
import util from 'util';
import yargs from 'yargs-parser';
import {addCommand, rmCommand} from './commands/add-rm';
import {command as initCommand} from './commands/init';
import {command as buildCommand} from './commands/build';
import {command as installCommand} from './commands/install';
import {command as devCommand} from './commands/dev';
import {loadAndValidateConfig} from './config.js';
import {logger} from './logger';
import {CLIFlags} from './types/snowpack';
import {clearCache, readLockfile} from './util.js';
export {createConfiguration} from './config.js';
export * from './types/snowpack';

// Stable API (remember to include all in "./index.esm.js" wrapper)
export {startDevServer} from './commands/dev';
export {loadAndValidateConfig};
export {getUrlForFile} from './build/file-urls';

/** @deprecated: Promoted to startDevServer() **/
export const unstable__startDevServer = () => {
  throw new Error(`[snowpack 2.15] unstable__startServer() is now startDevServer()`);
};
/** @deprecated: Promoted to loadAndValidateConfig() **/
export const unstable__loadAndValidateConfig = () => {
  throw new Error(
    `[snowpack 2.15] unstable__loadAndValidateConfig() is now loadAndValidateConfig()`,
  );
};
/** @deprecated: Promoted to getUrlForFile() **/
export const unstable__getUrlForFile = () => {
  throw new Error(`[snowpack 2.15] unstable__getUrlForFile() is now getUrlForFile()`);
};

const cwd = process.cwd();

function printHelp() {
  logger.info(
    `
${colors.bold(`snowpack`)} - A faster build system for the modern web.

  Snowpack is best configured via config file.
  But, most configuration can also be passed via CLI flags.
  📖 ${colors.dim('https://www.snowpack.dev/#configuration')}

${colors.bold('Commands:')}
  snowpack init          Create a new project config file.
  snowpack dev           Develop your app locally.
  snowpack build         Build your app for production.
  snowpack add [package] Add a package to your lockfile (import map).
  snowpack rm [package]  Remove a package from your lockfile.
  snowpack install       (Deprecated) Install web-ready dependencies.

${colors.bold('Flags:')}
  --config [path]        Set the location of your project config file.
  --help                 Show this help message.
  --version              Show the current version.
  --reload               Clear Snowpack's local cache (troubleshooting).
  --verbose              View debug info (where available)
  --quiet                Don’t output anything (dev server will still log minimally)
    `.trim(),
  );
}

export async function cli(args: string[]) {
  // parse CLI flags
  const cliFlags = yargs(args, {
    array: ['install', 'env', 'exclude', 'externalPackage'],
  }) as CLIFlags;

  if (cliFlags.verbose) {
    logger.level = 'debug';
  }
  if (cliFlags.quiet) {
    logger.level = 'silent';
  }
  if (cliFlags.help) {
    printHelp();
    process.exit(0);
  }
  if (cliFlags.version) {
    logger.info(require('../package.json').version);
    process.exit(0);
  }
  if (cliFlags.reload) {
    logger.info(colors.yellow('! clearing cache...'));
    await clearCache();
  }
  // Load the current package manifest
  let pkgManifest: any;
  try {
    pkgManifest = require(path.join(cwd, 'package.json'));
  } catch (err) {
    logger.error(`package.json not found in directory: ${cwd}. Run \`npm init -y\` to create one.`);
    process.exit(1);
  }

  const cmd = cliFlags['_'][2];
  logger.debug(`run command: ${cmd}`);
  if (!cmd) {
    printHelp();
    process.exit(1);
  }

  // Set this early -- before config loading -- so that plugins see it.
  if (cmd === 'build') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }
  if (cmd === 'dev') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  }

  const config = loadAndValidateConfig(cliFlags, pkgManifest);
  logger.debug(`config loaded: ${util.format(config)}`);
  const lockfile = await readLockfile(cwd);
  logger.debug(`lockfile ${lockfile ? 'loaded.' : 'not loaded'}`);
  const commandOptions = {
    cwd,
    config,
    lockfile,
    pkgManifest,
    logger,
  };

  if (cmd === 'add') {
    await addCommand(cliFlags['_'][3], commandOptions);
    return process.exit(0);
  }
  if (cmd === 'rm') {
    await rmCommand(cliFlags['_'][3], commandOptions);
    return process.exit(0);
  }

  if (cliFlags['_'].length > 3) {
    logger.error(`Unexpected multiple commands`);
    process.exit(1);
  }

  if (cmd === 'init') {
    await initCommand(commandOptions);
    return process.exit(0);
  }
  if (cmd === 'build') {
    await buildCommand(commandOptions);
    return process.exit(0);
  }
  if (cmd === 'dev') {
    await devCommand(commandOptions);
    return process.exit(0);
  }
  if (cmd === 'install') {
    await installCommand(commandOptions);
    return process.exit(0);
  }

  logger.error(`Unrecognized command: ${cmd}`);
  process.exit(1);
}
