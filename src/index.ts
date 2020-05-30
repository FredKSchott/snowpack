import chalk from 'chalk';
import path from 'path';
import yargs from 'yargs-parser';
import {command as buildCommand} from './commands/build';
import {command as devCommand} from './commands/dev';
import {addCommand, rmCommand} from './commands/add-rm';
import {command as installCommand} from './commands/install';
import {CLIFlags, loadAndValidateConfig} from './config.js';
import {clearCache} from './resolve-remote.js';
import {readLockfile} from './util.js';

const cwd = process.cwd();

function printHelp() {
  console.log(
    `
${chalk.bold(`snowpack`)} - Install npm dependencies to run natively on the web.
${chalk.bold('Options:')}
  --dest [path]             Specify destination directory (default: "web_modules/").
  --clean                   Clear out the destination directory before install.
  --optimize                Transpile, minify, and optimize installed dependencies for production.
  --env                     Set environment variable(s) inside dependencies:
                                - if only NAME given, reads value from real env var
                                - if \`NAME=value\`, uses given value
                                - NODE_ENV defaults to "production" with "--optimize" (overridable)
  --babel                   Transpile installed dependencies. Also enabled with "--optimize".
  --include [glob]          Auto-detect imports from file(s). Supports glob.
  --exclude [glob]          Exclude files from --include. Follows glob’s ignore pattern.
  --config [path]           Location of Snowpack config file.
  --strict                  Only install pure ESM dependency trees. Fail if a CJS module is encountered.
  --no-source-map           Skip emitting source map files (.js.map) into dest
  --stat                    Logs install statistics after installing, with information on install targets and file sizes. Useful for CI, performance review.
  --nomodule [path]         Your app’s entry file for generating a <script nomodule> bundle
  --nomodule-output [path]  Filename for nomodule output (default: "app.nomodule.js")
    ${chalk.bold('Advanced:')}
  --external-package [val]  Internal use only, may be removed at any time.
  --open                    Opens the dev server in a new browser tab. Any installed browser may also be specified. E.g., chrome, firefox, brave. (default: default).
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
    console.log(`${chalk.yellow('ℹ')} clearing CDN cache...`);
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
