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
import isNodeBuiltin from 'is-builtin-module';

// Having trouble getting this ES2019 feature to compile, so using this ponyfill for now.
function fromEntries(iterable: [string, string][]): {[key: string]: string} {
  return [...iterable]
    .reduce((obj, { 0: key, 1: val }) => Object.assign(obj, { [key]: val }), {})
}


export interface InstallOptions {
  destLoc: string;
  isCleanInstall?: boolean;
  isStrict?: boolean;
  isOptimized?: boolean;
  skipFailures?: boolean;
  namedExports?: {[filepath: string]: string[]};
  remoteUrl?: string;
  remotePackages: [string, string][];
}

const cwd = process.cwd();
const banner = chalk.bold(`@pika/web`) + ` installing... `;
const detectionResults = [];
let spinner = ora(banner);
let spinnerHasError = false;

function showHelp() {
  console.log(`${chalk.bold(`@pika/web`)} - Install npm dependencies to run natively on the web.`);
  console.log(`
  Options:
    --dest            Specify destination directory (default: "web_modules/").
    --clean           Clear out the destination directory before install.
    --optimize        Minify installed dependencies.
    --strict          Only install pure ESM dependency trees. Fail if a CJS module is encountered.
  Advanced Options:
    --remote-package  "name,version" pair(s) signal that a package should be left unbundled and referenced remotely.
                      Example: With the value "foo,v4" will rewrite all imports of "foo" to "{remoteUrl}/foo/v4" (see --remote-url).
    --remote-url      Configures the domain where remote imports point to (default: "https://cdn.pika.dev")
`);
}

function formatDetectionResults(skipFailures): string {
  return detectionResults
    .map(([d, yn]) => (yn ? chalk.green(d) : skipFailures ? chalk.dim(d) : chalk.red(d)))
    .join(', ');
}

function logError(msg) {
  if (!spinnerHasError) {
    spinner.stopAndPersist({symbol: chalk.cyan('⠼')});
  }
  spinnerHasError = true;
  spinner = ora(chalk.red(msg));
  spinner.fail();
}

class ErrorWithHint extends Error {
  constructor(message: string, public readonly hint: string) {
    super(message);
  }
}

// Add common, well-used non-esm packages here so that Rollup doesn't die trying to analyze them.
const PACKAGES_TO_AUTO_DETECT_EXPORTS = [
  path.join('node_modules', 'react', 'index.js'),
  path.join('node_modules', 'react-dom', 'index.js'),
  path.join('node_modules', 'react-is', 'index.js'),
  path.join('node_modules', 'prop-types', 'index.js'),
  path.join('node_modules', 'rxjs', 'Rx.js'),
];

function detectExports(filePath: string): string[] | undefined {
  const fileLoc = path.join(cwd, filePath);
  try {
    if (fs.existsSync(fileLoc)) {
      return Object.keys(require(fileLoc)).filter((e) => (e[0] !== '_'));
    }
  } catch (err) {
    console.log(err);
    // ignore
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
    throw new ErrorWithHint(
      `"${dep}" not found in your node_modules directory.`,
      chalk.italic(`Did you remember to run npm install?`),
    );
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
            'https://www.pika.dev',
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

export async function install(
  arrayOfDeps: string[],
  {isCleanInstall, destLoc, skipFailures, isStrict, isOptimized, namedExports, remoteUrl, remotePackages}: InstallOptions,
) {

  const knownNamedExports = {...namedExports};
  const remotePackageMap = fromEntries(remotePackages);
  for (const filePath of PACKAGES_TO_AUTO_DETECT_EXPORTS) {
    knownNamedExports[filePath] = knownNamedExports[filePath] || detectExports(filePath) || [];
  }

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

  if (Object.keys(depObject).length === 0) {
    logError(`No ESM dependencies found!`);
    console.log(chalk.dim(`  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at ${chalk.underline('https://www.pika.dev')}`));
    return false;
  }

  const inputOptions = {
    input: depObject,
    plugins: [
      !isStrict &&
        rollupPluginReplace({
          'process.env.NODE_ENV': isOptimized ? '"production"' : '"development"',
        }),
      remotePackages.length > 0 && {
          name: 'pika:peer-dependency-resolver',
          resolveId (source: string) {
            if (remotePackageMap[source]) {
              let urlSourcePath = source;
              // NOTE(@fks): This is really Pika CDN specific, but no one else should be using this option.
              // Don't release to latest until this is codified via arguments.
              if (source === 'react' || source === 'react-dom') {
                urlSourcePath = '_/' + source;
              }
              return {
                id: `${remoteUrl}/${urlSourcePath}/${remotePackageMap[source]}`,
                 external: true,
                 isExternal: true
              };
            }
            return null;
          },
          load ( id ) { return null; }
        },
       rollupPluginNodeResolve({
        mainFields: ['browser', 'module', 'jsnext:main', !isStrict && 'main'].filter(Boolean),
        modulesOnly: isStrict, // Default: false
        extensions: ['.mjs', '.cjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
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
          namedExports: knownNamedExports
        }),
      !!isOptimized && rollupPluginTerser(),
    ],
    onwarn: ((warning, warn) => {
      if (warning.code === 'UNRESOLVED_IMPORT') {
        logError(`'${warning.source}' is imported by '${warning.importer}', but could not be resolved.`);
        if (isNodeBuiltin(warning.source)) {
          console.log(chalk.dim(`  '${warning.source}' is a Node.js builtin module that won't exist on the web. You can find modern, web-ready packages at ${chalk.underline('https://www.pika.dev')}`));
        } else {
          console.log(chalk.dim(`  Make sure that the package is installed and that the file exists.`));
        }
        return;
      }
      warn(warning);
    }) as any
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
  const {help, optimize = false, strict = false, clean = false, dest = 'web_modules', remoteUrl = 'https://cdn.pika.dev', remotePackage: remotePackages = []} = yargs(args);
  const destLoc = path.join(cwd, dest);

  if (help) {
    showHelp();
    process.exit(0);
  }

  const pkgManifest = require(path.join(cwd, 'package.json'));
  const {namedExports, webDependencies} = pkgManifest['@pika/web'] || {namedExports: undefined, webDependencies:undefined};
  const doesWhitelistExist = !!webDependencies;
  const arrayOfDeps = webDependencies || Object.keys(pkgManifest.dependencies || {});
  spinner.start();
  const startTime = Date.now();
  const result = await install(arrayOfDeps, {
    isCleanInstall: clean,
    destLoc,
    namedExports,
    skipFailures: !doesWhitelistExist,
    isStrict: strict,
    isOptimized: optimize,
    remoteUrl,
    remotePackages: remotePackages.map(p => p.split(',')),
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
  if (spinnerHasError) {
    // Set the exit code so that programatic usage of the CLI knows that there were errors.
    spinner.warn(chalk(`Finished with warnings.`));
    process.exitCode = 1;
  }
}
