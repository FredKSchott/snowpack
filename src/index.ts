import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import chalk from 'chalk';
import ora from 'ora';
import yargs from 'yargs-parser';
import https from 'https';
import mkdirp from 'mkdirp';
import os from 'os';

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
  skipNpm?: boolean;
}

const cwd = process.cwd();
const cdnUrl = 'https://unpkg.com';
const cwdManifest = require(path.join(cwd, 'package.json'));
const banner = chalk.bold(`@pika/web`) + ` installing... `;
const detectionResults = [];
let spinner = ora(banner);

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

function formatDetectionResults(skipFailures): string {
  return detectionResults
    .map(([d, yn]) => (yn ? chalk.green(d) : skipFailures ? chalk.dim(d) : chalk.red(d)))
    .join(', ');
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

function getDependency(dep: string): string {
  let [scope, name] = dep.split('/');
  if (scope.charAt(0) === '@') scope += '/' + name;
  return scope;
}

function resolveWebDepFromCDN(dep: string): string {
  const depFromDeps = getDependency(dep);
  const deps = cwdManifest.dependencies || {};
  const version = deps[depFromDeps] ? `@${deps[depFromDeps]}` : '';
  return `${cdnUrl}/${depFromDeps}${version}?type=module`;
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

  throw new Error(`Error loading "${dep}" at "${nodeModulesLoc}". (MODE=${dependencyStats.mode}) `);
}

/**
 * Formats the @pika/web dependency name from a "webDependencies" input value:
 * 2. Remove any ".js" extension (will be added automatically by Rollup)
 */
function getWebDependencyName(dep: string): string {
  return dep.replace(/\.js$/, '');
}

function safeWriter(file: string) {
  file = path.normalize(file);
  mkdirp.sync(path.dirname(file));
  return fs.createWriteStream(file);
}

function download(uri: string, file: string) {
  return new Promise((res, rej) => {
    https
      .get(uri, r => {
        const code = r.statusCode;
        if (code >= 400) return rej({code, message: r.statusMessage});
        if (code > 300 && code < 400) {
          return download(`${cdnUrl}${r.headers.location}`, file).then(res);
        }
        const write = safeWriter(file).on('finish', _ => res(file));
        r.pipe(write);
      })
      .on('error', rej);
  });
}

export async function install(
  arrayOfDeps: string[],
  {isCleanInstall, destLoc, skipFailures, isStrict, isOptimized, skipNpm}: InstallOptions,
) {
  if (arrayOfDeps.length === 0) {
    logError('no dependencies found.');
    return;
  }
  if (!fs.existsSync(path.join(cwd, 'node_modules')) && !skipNpm) {
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
      const depLoc = skipNpm ? resolveWebDepFromCDN(dep) : resolveWebDependency(dep);
      depObject[depName] = depLoc;
      detectionResults.push([dep, true]);
      spinner.text = banner + formatDetectionResults(skipFailures);
    } catch (err) {
      detectionResults.push([dep, false]);
      spinner.text = banner + formatDetectionResults(skipFailures);
      if (skipFailures) {
        continue;
      }
      // An error occurred! Log it.
      logError(err.message || err);
      if (err.hint) {
        console.log(err.hint);
      }
      return false;
    }
  }

  if (skipNpm) {
    const promises = [];
    for (const dep in depObject) {
      const depPath = path.join(os.tmpdir(), 'pika-web', `${dep}.js`);
      promises.push(download(depObject[dep], depPath));
      depObject[dep] = depPath;
    }
    await Promise.all(promises);
  }

  const inputOptions = {
    input: depObject,
    plugins: [
      !isStrict &&
        rollupPluginReplace({
          'process.env.NODE_ENV': isOptimized ? '"production"' : '"development"',
        }),
      !skipNpm &&
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
  const {
    help,
    optimize = false,
    strict = false,
    clean = false,
    dest = 'web_modules',
    skipNpm = false,
  } = yargs(args);
  const destLoc = path.join(cwd, dest);

  if (help) {
    showHelp();
    process.exit(0);
  }

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
    skipNpm,
  });
  if (result) {
    spinner.succeed(
      chalk.bold(`@pika/web`) +
        ` installed: ` +
        formatDetectionResults(!doesWhitelistExist) +
        '. ' +
        chalk.dim(`[${((Date.now() - startTime) / 1000).toFixed(2)}s]`),
    );
  }
}
