import * as colors from 'kleur/colors';
import util from 'util';
import yargs from 'yargs-parser';
import {addCommand, rmCommand} from './commands/add-rm';
import {command as initCommand} from './commands/init';
import {command as prepareCommand} from './commands/prepare';
// import {command as installCommand} from './sources/local-install';
import {command as buildCommand} from './commands/build';
import {command as devCommand} from './commands/dev';
import {logger} from './logger';
import {loadConfiguration, expandCliFlags} from './config';
import {CLIFlags, CommandOptions} from './types';
import {clearCache, readLockfile} from './util.js';
export * from './types';

// Stable API (remember to include all in "./index.esm.js" wrapper)
export {startDevServer} from './commands/dev';
export {buildProject} from './commands/build';
export {loadConfiguration, createConfiguration} from './config.js';
export {readLockfile as loadLockfile} from './util.js';
export {getUrlForFile} from './build/file-urls';
export {logger} from './logger';

export function loadAndValidateConfig() {
  throw new Error(
    'loadAndValidateConfig() has been deprecated in favor of loadConfiguration() and createConfiguration()',
  );
}

function printHelp() {
  logger.info(
    `
${colors.bold(`snowpack`)} - A faster build system for the modern web.

  Snowpack is best configured via config file.
  But, most configuration can also be passed via CLI flags.
  📖 ${colors.dim('https://www.snowpack.dev/reference/configuration')}

${colors.bold('Commands:')}
  snowpack init          Create a new project config file.
  snowpack dev           Develop your app locally.
  snowpack build         Build your app for production.
  snowpack add [package] Add a package to your lockfile (import map).
  snowpack rm [package]  Remove a package from your lockfile.

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
    array: ['install', 'env', 'exclude', 'external'],
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

  const cliConfig = expandCliFlags(cliFlags);
  const config = await loadConfiguration(cliConfig, cliFlags.config);
  logger.debug(`config loaded: ${util.format(config)}`);
  // TODO: process.cwd() okay here? Should the lockfile live at root instead of cwd?
  const lockfile = await readLockfile(process.cwd());
  logger.debug(`lockfile ${lockfile ? 'loaded.' : 'not loaded'}`);
  const commandOptions: CommandOptions = {
    config,
    lockfile,
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

  // DEPRECATED: To be removed once final esinstall test is moved off of "snowpack install"
  // if (cmd === 'install') {
  //   await installCommand(commandOptions);
  //   return process.exit(0);
  // }
  if (cmd === 'prepare') {
    await prepareCommand(commandOptions);
    return process.exit(0);
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

  logger.error(`Unrecognized command: ${cmd}`);
  process.exit(1);
}
