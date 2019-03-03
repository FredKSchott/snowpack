import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs-parser';

import * as rollup from 'rollup';
import rollupPluginNodeResolve from 'rollup-plugin-node-resolve';
import rollupPluginCommonjs from 'rollup-plugin-commonjs';
import { terser as rollupPluginTerser } from "rollup-plugin-terser";

export interface InstallOptions {
  destLoc: string;
  isCleanInstall?: boolean;
  isWhitelist?: boolean;
  isStrict?: boolean;
  isOptimized?: boolean;
}

const cwd = process.cwd();
let spinner = ora(chalk.bold(`@pika/web`) + ` installing...`);

function showHelp() {
  console.log(`${chalk.bold(`@pika/web`)} - Install npm dependencies to run natively on the web.`);
  console.log(`
  Options
    --dest      Specify destination directory (default: "web_modules/").
    --clean     Clear out the destination directory before install.
    --optimize  Minify installed dependencies.
    --strict    Only install pure ESM dependency trees. Fail if a CJS module is encountered.
`);
}

function logError(msg) {
  spinner.stopAndPersist({symbol: chalk.cyan('⠼')});
  spinner = ora(chalk.red(msg));
  spinner.fail();
}

function transformWebModuleFilename(depName:string):string {
  return depName.replace('/', '--');
}

export async function install(arrayOfDeps: string[], {isCleanInstall, destLoc, isWhitelist, isStrict, isOptimized}: InstallOptions) {
  if (arrayOfDeps.length === 0) {
    logError('no dependencies found.');
    return;
  }
  if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
    logError('no node_modules/ directory exists. Run "npm install" in your project before running @pika/web.');
    return;
  }

  if (isCleanInstall) {
    rimraf.sync(destLoc);
  }

  const depObject = {};
  for (const dep of arrayOfDeps) {
    const depLoc = path.join(cwd, 'node_modules', dep);
    if (!fs.existsSync(depLoc)) {
        logError(`dependency "${dep}" not found in your node_modules/ directory. Did you run npm install?`);
      return;
    }
    const depManifestLoc = path.join(cwd, 'node_modules', dep, 'package.json');
    const depManifest = require(depManifestLoc);
    if (!depManifest.module) {
      if (isWhitelist) {
        logError(`dependency "${dep}" has no ES "module" entrypoint.`);
        console.log('\n' + chalk.italic(`Tip: Find modern, web-ready packages at ${chalk.underline('https://pikapkg.com/packages')}`) + '\n');
        return false;
      }
      continue;
    }
    depObject[transformWebModuleFilename(dep)] = path.join(depLoc, depManifest.module);
  }

  const inputOptions = {
    input: depObject,
    plugins: [
      rollupPluginNodeResolve({
        module: true, // Default: true
        jsnext: false,  // Default: false
        main: !isStrict,  // Default: true
        browser: false,  // Default: false
        modulesOnly: isStrict, // Default: false
        extensions: [ '.mjs', '.js', '.json' ],  // Default: [ '.mjs', '.js', '.json', '.node' ]
        jail: path.join(cwd, 'node_modules'),
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: false,  // Default: true
      }),
      !isStrict && rollupPluginCommonjs({
        extensions: [ '.js', '.cjs' ],  // Default: [ '.js' ]
      }),
      isOptimized && rollupPluginTerser()
    ]
  };
  const outputOptions = {
    dir: destLoc,
    format: "esm" as 'esm',
    sourcemap: true,
    exports: 'named' as 'named',
    chunkFileNames: "common/[name]-[hash].js"
  };
  const packageBundle = await rollup.rollup(inputOptions);
  await packageBundle.write(outputOptions);
  return true;
}

export async function cli(args: string[]) {
  const {help, optimize = false, strict = false, clean = false, dest = "web_modules"} = yargs(args);
  const destLoc = path.join(cwd, dest);

	if (help) {
    showHelp();
    process.exit(0);
  }

  const cwdManifest = require(path.join(cwd, 'package.json'));
  const isWhitelist = !!cwdManifest && !!cwdManifest['@pika/web'] && !!cwdManifest['@pika/web'].webDependencies;
  const arrayOfDeps = isWhitelist ? cwdManifest['@pika/web'].webDependencies : Object.keys(cwdManifest.dependencies || {});
  spinner.start();
  const startTime = Date.now();
  const result = await install(arrayOfDeps, {isCleanInstall: clean, destLoc, isWhitelist, isStrict: strict, isOptimized: optimize});
  if (result) {
    spinner.succeed(chalk.green.bold(`@pika/web`) + ` installed web-native dependencies. ` + chalk.dim(`[${((Date.now() - startTime) / 1000).toFixed(2)}s]`));
  }
}