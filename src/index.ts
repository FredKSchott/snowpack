import chalk from 'chalk';
import path from 'path';
import yargs from 'yargs-parser';
import {command as buildCommand} from './commands/build';
import {command as devCommand} from './commands/dev';
import {addCommand, rmCommand} from './commands/add-rm';
import {command as installCommand} from './commands/install';
import {CLIFlags, loadAndValidateConfig} from './config.js';
import {readLockfile, clearCache} from './util.js';

const cwd = process.cwd();

function printHelp() {
  console.log(
    `
${chalk.bold(`snowpack`)} - A faster build system for the modern web.

  Snowpack is best configured via config file.
  But, most configuration can also be passed via CLI flags.
  📖 ${chalk.dim('https://www.snowpack.dev/#configuration')}

${chalk.bold('Commands:')}
  snowpack dev          Develop your app locally.
  snowpack build        Build your app for production.
  snowpack install      (Advanced) Install web-ready dependencies.

${chalk.bold('Flags:')}
  --config [path]       Set the location of your project config file.
  --help                Show this help message.
  --version             Show the current version.
  --reload              Clear Snowpack's local cache (troubleshooting).
    `.trim(),
  );
}

export async function cli(args: string[]) {
  // parse CLI flags
  const cliFlags = yargs(args, {array: ['env', 'exclude', 'externalPackage']}) as CLIFlags;
  if (cliFlags.help) {
    printHelp();
    process.exit(0);
  }
  if (cliFlags.version) {
    console.log(require('../package.json').version);
    process.exit(0);
  }
  if (cliFlags.reload) {
    console.log(chalk.yellow('! clearing cache...'));
    await clearCache();
  }

  // Load the current package manifest
  let pkgManifest: any;
  try {
    pkgManifest = require(path.join(cwd, 'package.json'));
  } catch (err) {
    console.log(chalk.red('[ERROR] package.json required but no file was found.'));
    process.exit(1);
  }

  const cmd = cliFlags['_'][2];

  // Set this early - before config loading - so that plugins see it.
  if (cmd === 'build') {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }

  const commandOptions = {
    cwd,
    config: loadAndValidateConfig(cliFlags, pkgManifest),
    lockfile: await readLockfile(cwd),
    pkgManifest,
  };

  if (cmd === 'add') {
    await addCommand(cliFlags['_'][3], commandOptions);
    return;
  }
  if (cmd === 'rm') {
    await rmCommand(cliFlags['_'][3], commandOptions);
    return;
  }

  if (cliFlags['_'].length > 3) {
    console.log(`Unexpected multiple commands`);
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

  console.log(`Unrecognized command: ${cmd}`);
  process.exit(1);
}
