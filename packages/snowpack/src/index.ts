import * as colors from 'kleur/colors';
import path from 'path';
import yargs from 'yargs-parser';
import {addCommand, rmCommand} from './commands/add-rm';
import {command as buildCommand} from './commands/build';
import {command as devCommand} from './commands/dev';
import {command as installCommand} from './commands/install';
import {loadAndValidateConfig} from './config.js';
import {logger} from './logger';
import {CLIFlags} from './types/snowpack';
import {clearCache, readLockfile} from './util.js';

export {install as unstable_installCommand} from './commands/install';
export {createConfiguration} from './config.js';
export * from './types/snowpack';

const cwd = process.cwd();

function printHelp() {
  logger.info(
    `
${colors.bold(`snowpack`)} - A faster build system for the modern web.

  Snowpack is best configured via config file.
  But, most configuration can also be passed via CLI flags.
  📖 ${colors.dim('https://www.snowpack.dev/#configuration')}

${colors.bold('Commands:')}
  snowpack dev          Develop your app locally.
  snowpack build        Build your app for production.
  snowpack install      (Advanced) Install web-ready dependencies.

${colors.bold('Flags:')}
  --config [path]       Set the location of your project config file.
  --help                Show this help message.
  --version             Show the current version.
  --reload              Clear Snowpack's local cache (troubleshooting).
  --verbose             View debug info (where available)
  --quiet               Don’t output anything (dev server will still log minimally)
    `.trim(),
  );
}

export async function cli(args: string[]) {
  // parse CLI flags
  const cliFlags = yargs(args, {
    array: ['install', 'env', 'exclude', 'externalPackage'],
  }) as CLIFlags;
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

  // Set this early -- before config loading -- so that plugins see it.
  if (cmd === 'build') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }
  if (cmd === 'dev') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  }

  const commandOptions = {
    cwd,
    config: loadAndValidateConfig(cliFlags, pkgManifest),
    lockfile: await readLockfile(cwd),
    pkgManifest,
    logger,
  };

  if (cliFlags.verbose) logger.level = 'debug';
  if (cliFlags.quiet) logger.level = 'silent';

  if (cmd === 'add') {
    await addCommand(cliFlags['_'][3], commandOptions);
    return;
  }
  if (cmd === 'rm') {
    await rmCommand(cliFlags['_'][3], commandOptions);
    return;
  }

  if (cliFlags['_'].length > 3) {
    logger.error(`Unexpected multiple commands`);
    process.exit(1);
  }

  if (cmd === 'build') {
    await buildCommand(commandOptions);
    return;
  }
  if (cmd === 'dev') {
    await devCommand(commandOptions);
    return;
  }
  if (cmd === 'install' || !cmd) {
    await installCommand(commandOptions);
    return;
  }

  logger.error(`Unrecognized command: ${cmd}`);
  process.exit(1);
}
