import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs-parser';

import * as rollup from 'rollup';
import rollupPluginNodeResolve from 'rollup-plugin-node-resolve';
import rollupPluginCommonjs from 'rollup-plugin-commonjs';
import {terser as rollupPluginTerser} from 'rollup-plugin-terser';
import rollupPluginReplace from 'rollup-plugin-replace';
import rollupPluginJson from 'rollup-plugin-json';

export interface InstallOptions {
  destLoc: string;
  isCleanInstall?: boolean;
  isStrict?: boolean;
  isOptimized?: boolean;
  skipFailures?: boolean;
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

class ErrorWithHint extends Error {
  constructor(message: string, public readonly hint: string) {
    super(message);
  }
}

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
function resolveWebDependency(dep: string): string {
  const nodeModulesLoc = path.join(cwd, 'node_modules', dep);
  let dependencyStats: fs.Stats;
  try {
    dependencyStats = fs.statSync(nodeModulesLoc);
  } catch (err) {
    throw new Error(`"${dep}" not found in your node_modules directory. Did you run npm install?`);
  }
  if (dependencyStats.isFile()) {
    return nodeModulesLoc;
  }
  if (dependencyStats.isDirectory()) {
    const dependencyManifestLoc = path.join(nodeModulesLoc, 'package.json');
    const manifest = require(dependencyManifestLoc);
    if (!manifest.module) {
      throw new ErrorWithHint(
        `dependency "${dep}" has no ES "module" entrypoint.`,
        chalk.italic(
          `Tip: Find modern, web-ready packages at ${chalk.underline(
            'https://pikapkg.com/packages',
          )}`,
        ),
      );
    }
    return path.join(nodeModulesLoc, manifest.module);
  }

  throw new Error(
    `Error loading "${dep}" at "${nodeModulesLoc}". (MODE=${dependencyStats.mode}) `,
  );
}

/**
 * Formats the @pika/web dependency name from a "webDependencies" input value:
 * 2. Remove any ".js" extension (will be added automatically by Rollup)
 */
function getWebDependencyName(dep: string): string {
  return dep.replace(/\.js$/, '');
}

export async function install(
  arrayOfDeps: string[],
  {isCleanInstall, destLoc, skipFailures, isStrict, isOptimized}: InstallOptions,
) {
  if (arrayOfDeps.length === 0) {
    logError('no dependencies found.');
    return;
  }
  if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
    logError('no "node_modules" directory exists. Did you run "npm install" first?');
    return;
  }

  if (isCleanInstall) {
    rimraf.sync(destLoc);
  }

  const depObject = {};
  for (const dep of arrayOfDeps) {
    try {
      const depName = getWebDependencyName(dep);
      const depLoc = resolveWebDependency(dep);
      depObject[depName] = depLoc;
    } catch (err) {
      // An error occurred! Log it.
      logError(err.message || err);
      if (err.hint) {
        console.log(err.hint);
      }
      if (!skipFailures) {
        return false;
      }
    }
  }

  const inputOptions = {
    input: depObject,
    plugins: [
      !isStrict &&
        rollupPluginReplace({
          'process.env.NODE_ENV': isOptimized ? '"production"' : '"development"',
        }),
      rollupPluginNodeResolve({
        module: true, // Default: true
        jsnext: false, // Default: false
        main: !isStrict, // Default: true
        browser: false, // Default: false
        modulesOnly: isStrict, // Default: false
        extensions: ['.mjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: false, // Default: true
      }),
      !isStrict &&
        rollupPluginJson({
          preferConst: true,
          indent: '  ',
        }),
      !isStrict &&
        rollupPluginCommonjs({
          extensions: ['.js', '.cjs'], // Default: [ '.js' ]
        }),
      isOptimized && rollupPluginTerser(),
    ],
  };
  const outputOptions = {
    dir: destLoc,
    format: 'esm' as 'esm',
    sourcemap: true,
    exports: 'named' as 'named',
    chunkFileNames: 'common/[name]-[hash].js',
  };
  const packageBundle = await rollup.rollup(inputOptions);
  await packageBundle.write(outputOptions);
  return true;
}

export async function cli(args: string[]) {
  const {help, optimize = false, strict = false, clean = false, dest = 'web_modules'} = yargs(args);
  const destLoc = path.join(cwd, dest);

  if (help) {
    showHelp();
    process.exit(0);
  }

  const cwdManifest = require(path.join(cwd, 'package.json'));
  const doesWhitelistExist = !!(
    cwdManifest['@pika/web'] && cwdManifest['@pika/web'].webDependencies
  );
  const arrayOfDeps = doesWhitelistExist
    ? cwdManifest['@pika/web'].webDependencies
    : Object.keys(cwdManifest.dependencies || {});
  spinner.start();
  const startTime = Date.now();
  const result = await install(arrayOfDeps, {
    isCleanInstall: clean,
    destLoc,
    skipFailures: !doesWhitelistExist,
    isStrict: strict,
    isOptimized: optimize,
  });
  if (result) {
    spinner.succeed(
      chalk.green.bold(`@pika/web`) +
        ` installed web-native dependencies. ` +
        chalk.dim(`[${((Date.now() - startTime) / 1000).toFixed(2)}s]`),
    );
  }
}
