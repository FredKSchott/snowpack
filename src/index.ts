import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import chalk from 'chalk';
import glob from 'glob';
import ora from 'ora';
import yargs from 'yargs-parser';
import resolveFrom from 'resolve-from';

import * as rollup from 'rollup';
import rollupPluginNodeResolve from 'rollup-plugin-node-resolve';
import rollupPluginCommonjs from 'rollup-plugin-commonjs';
import {terser as rollupPluginTerser} from 'rollup-plugin-terser';
import rollupPluginReplace from 'rollup-plugin-replace';
import rollupPluginJson from 'rollup-plugin-json';
import rollupPluginBabel from 'rollup-plugin-babel';
import babelPresetEnv from '@babel/preset-env';
import isNodeBuiltin from 'is-builtin-module';
import autoResolve from './auto-resolve.js';

// Having trouble getting this ES2019 feature to compile, so using this ponyfill for now.
function fromEntries(iterable: [string, string][]): {[key: string]: string} {
  return [...iterable].reduce((obj, {0: key, 1: val}) => Object.assign(obj, {[key]: val}), {});
}

export interface DependencyLoc {
  type: 'JS' | 'ASSET';
  loc: string;
}

export interface InstallOptions {
  dependencyTree?: string;
  destLoc: string;
  entry?: string;
  isCleanInstall?: boolean;
  isStrict?: boolean;
  isOptimized?: boolean;
  isBabel?: boolean;
  hasBrowserlistConfig?: boolean;
  isExplicit?: boolean;
  namedExports?: {[filepath: string]: string[]};
  remoteUrl?: string;
  remotePackages: [string, string][];
  sourceMap?: boolean | 'inline';
}

const cwd = process.cwd();
const banner = chalk.bold(`@pika/web`) + ` installing... `;
const detectionResults = [];
let spinner = ora(banner);
let spinnerHasError = false;

function printHelp() {
  console.log(
    `
${chalk.bold(`@pika/web`)} - Install npm dependencies to run natively on the web.
${chalk.bold('Options:')}
    --dest              Specify destination directory (default: "web_modules/").
    --clean             Clear out the destination directory before install.
    --optimize          Transpile, minify, and optimize installed dependencies for production.
    --babel             Transpile installed dependencies. Also enabled with "--optimize".
    --entry             Entry file(s) to recursively scan for imports, comma-separated
    --dep-tree          Output dependency-tree.json (default: false)
    --strict            Only install pure ESM dependency trees. Fail if a CJS module is encountered.
    --no-source-map     Skip emitting source map files (.js.map) into dest
${chalk.bold('Advanced:')}
    --remote-package    "name,version" pair(s) of packages that should be left unbundled and referenced remotely.
                        Example: "foo,v4" will rewrite all imports of "foo" to "{remoteUrl}/foo/v4" (see --remote-url).
    --remote-url        Configures the domain where remote imports point to (default: "https://cdn.pika.dev")
    `.trim(),
  );
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
  path.join('react', 'index.js'),
  path.join('react-dom', 'index.js'),
  path.join('react-is', 'index.js'),
  path.join('prop-types', 'index.js'),
  path.join('rxjs', 'Rx.js'),
];

function detectExports(filePath: string): string[] | undefined {
  try {
    const fileLoc = resolveFrom(cwd, filePath);
    if (fs.existsSync(fileLoc)) {
      return Object.keys(require(fileLoc)).filter(e => e[0] !== '_');
    }
  } catch (err) {
    // ignore
  }
}

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
function resolveWebDependency(dep: string, isExplicit: boolean): DependencyLoc {
  // if the path includes a file extension, just use it
  if (path.extname(dep)) {
    const isJSFile = ['.js', '.mjs', '.cjs'].includes(path.extname(dep));
    return {
      type: isJSFile ? 'JS' : 'ASSET',
      loc: resolveFrom(cwd, dep),
    };
  }

  const depManifestLoc = resolveFrom(cwd, `${dep}/package.json`);
  const depManifest = require(depManifestLoc);
  let foundEntrypoint: string = depManifest.module;
  // If the package was a part of the explicit whitelist, fallback to it's main CJS entrypoint.
  if (!foundEntrypoint && isExplicit) {
    foundEntrypoint = depManifest.main || 'index.js';
  }
  if (!foundEntrypoint) {
    throw new ErrorWithHint(
      `dependency "${dep}" has no native "module" entrypoint.`,
      chalk.italic(
        `Tip: Find modern, web-ready packages at ${chalk.underline('https://www.pika.dev')}`,
      ),
    );
  }
  if (dep === 'react' && foundEntrypoint === 'index.js') {
    throw new ErrorWithHint(
      `dependency "react" has no native "module" entrypoint.`,
      chalk.italic(`See: ${chalk.underline('https://github.com/pikapkg/web#a-note-on-react')}`),
    );
  }
  return {
    type: 'JS',
    loc: path.join(depManifestLoc, '..', foundEntrypoint),
  };
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
  {
    isCleanInstall,
    dependencyTree,
    destLoc,
    hasBrowserlistConfig,
    isExplicit,
    isStrict,
    isBabel,
    isOptimized,
    sourceMap,
    namedExports,
    remoteUrl,
    remotePackages,
  }: InstallOptions,
) {
  const nodeModulesLoc = path.join(cwd, 'node_modules');
  const knownNamedExports = {...namedExports};
  const remotePackageMap = fromEntries(remotePackages);
  const depList: Set<string> = new Set();
  arrayOfDeps.forEach(dep => {
    if (!glob.hasMagic(dep)) {
      depList.add(dep);
    } else {
      glob.sync(dep, {cwd: nodeModulesLoc, nodir: true}).forEach(f => depList.add(f));
    }
  });
  for (const filePath of PACKAGES_TO_AUTO_DETECT_EXPORTS) {
    knownNamedExports[filePath] = knownNamedExports[filePath] || detectExports(filePath) || [];
  }

  if (depList.size === 0) {
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

  const depObject: {[depName: string]: string} = {};
  const assetObject: {[depName: string]: string} = {};
  const importMap = {};
  const skipFailures = !isExplicit;
  for (const dep of depList) {
    try {
      const depName = getWebDependencyName(dep);
      const {type: depType, loc: depLoc} = resolveWebDependency(dep, isExplicit);
      if (depType === 'JS') {
        depObject[depName] = depLoc;
        importMap[depName] = `./${depName}.js`;
        detectionResults.push([dep, true]);
      }
      if (depType === 'ASSET') {
        assetObject[depName] = depLoc;
        detectionResults.push([dep, true]);
      }
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

  if (Object.keys(depObject).length === 0 && Object.keys(assetObject).length === 0) {
    logError(`No ESM dependencies found!`);
    console.log(
      chalk.dim(
        `  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at ${chalk.underline(
          'https://www.pika.dev',
        )}`,
      ),
    );
    return false;
  }

  if (Object.keys(depObject).length > 0) {
    const inputOptions = {
      input: depObject,
      plugins: [
        !isStrict &&
          rollupPluginReplace({
            'process.env.NODE_ENV': isOptimized ? '"production"' : '"development"',
          }),
        remotePackages.length > 0 && {
          name: 'pika:peer-dependency-resolver',
          resolveId(source: string) {
            if (remotePackageMap[source]) {
              let urlSourcePath = source;
              // NOTE(@fks): This is really Pika CDN specific, but no one else should be using this option.
              if (source === 'react' || source === 'react-dom') {
                urlSourcePath = '_/' + source;
              }
              return {
                id: `${remoteUrl}/${urlSourcePath}/${remotePackageMap[source]}`,
                external: true,
                isExternal: true,
              };
            }
            return null;
          },
          load(id) {
            return null;
          },
        },
        rollupPluginNodeResolve({
          mainFields: ['browser', 'module', !isStrict && 'main'].filter(Boolean),
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
            namedExports: knownNamedExports,
          }),
        !!isBabel &&
          rollupPluginBabel({
            compact: false,
            babelrc: false,
            presets: [
              [
                babelPresetEnv,
                {
                  modules: false,
                  targets: hasBrowserlistConfig ? undefined : '>0.75%, not ie 11, not op_mini all',
                },
              ],
            ],
          }),
        !!isOptimized && rollupPluginTerser(),
      ],
      onwarn: ((warning, warn) => {
        if (warning.code === 'UNRESOLVED_IMPORT') {
          // If we're using remoteUrl, we should expect them to be unresolved. ("external" should handle this for us, but we're still seeing it)
          if (remoteUrl && warning.source.startsWith(remoteUrl)) {
            return;
          }
          logError(
            `'${warning.source}' is imported by '${warning.importer}', but could not be resolved.`,
          );
          if (isNodeBuiltin(warning.source)) {
            console.log(
              chalk.dim(
                `  '${
                  warning.source
                }' is a Node.js builtin module that won't exist on the web. You can find modern, web-ready packages at ${chalk.underline(
                  'https://www.pika.dev',
                )}`,
              ),
            );
          } else {
            console.log(
              chalk.dim(`  Make sure that the package is installed and that the file exists.`),
            );
          }
          return;
        }
        warn(warning);
      }) as any,
    };
    const outputOptions = {
      dir: destLoc,
      format: 'esm' as 'esm',
      sourcemap: sourceMap === undefined ? isOptimized : sourceMap,
      exports: 'named' as 'named',
      chunkFileNames: 'common/[name]-[hash].js',
    };
    const packageBundle = await rollup.rollup(inputOptions);
    await packageBundle.write(outputOptions);
    fs.writeFileSync(
      path.join(destLoc, 'import-map.json'),
      JSON.stringify({imports: importMap}, undefined, 2),
      {encoding: 'utf8'},
    );
    if (dependencyTree) {
      fs.writeFileSync(path.resolve(destLoc, 'dependency-tree.json'), dependencyTree, 'utf8');
    }
  }
  Object.entries(assetObject).forEach(([assetName, assetLoc]) => {
    mkdirp.sync(path.dirname(`${destLoc}/${assetName}`));
    fs.copyFileSync(assetLoc, `${destLoc}/${assetName}`);
  });
  return true;
}

export async function cli(args: string[]) {
  const {
    help,
    sourceMap,
    babel = false,
    optimize = false,
    entry,
    depTree = false,
    strict = false,
    clean = false,
    dest = 'web_modules',
    remoteUrl = 'https://cdn.pika.dev',
    remotePackage: remotePackages = [],
  } = yargs(args);
  const destLoc = path.resolve(cwd, dest);

  if (help) {
    printHelp();
    process.exit(0);
  }

  const pkgManifest = require(path.join(cwd, 'package.json'));
  const {namedExports, webDependencies} = pkgManifest['@pika/web'] || {
    namedExports: undefined,
    webDependencies: undefined,
  };
  let doesWhitelistExist = !!webDependencies;
  let arrayOfDeps = webDependencies || Object.keys(pkgManifest.dependencies || {});
  const hasBrowserlistConfig =
    !!pkgManifest.browserslist ||
    !!process.env.BROWSERSLIST ||
    fs.existsSync(path.join(cwd, '.browserslistrc')) ||
    fs.existsSync(path.join(cwd, 'browserslist'));
  let dependencyTree: string | undefined;

  // auto detection with --entry flag
  if (typeof entry === 'string' && entry.length) {
    const depSpinner = ora(`Scanning ${entry}`).start();
    const files = entry.split(',').map(file => path.resolve(cwd, file));

    const timeStart = process.hrtime(); // start perf benchmark

    // grab dependencies
    const fileDeps = autoResolve(files, cwd);

    // print out dependency tree if specified
    if (depTree) {
      dependencyTree = JSON.stringify({dependencies: fileDeps});
    }

    // this will examine package.json dependencies for any matches.
    const destRoot = dest.replace(/\/$/, '').split('/'); // take last segment of --dest
    if (pkgManifest.dependencies) {
      // take an import string and figure out if it’s a dependency in package.json
      function npmName(filename: string) {
        const npmRoot = filename.split(`${destRoot[destRoot.length - 1]}/`)[1]; // determine npm root based on --dest
        if (!npmRoot) {
          return;
        }
        const moduleName = npmRoot.replace(/\.[A-z]+$/, ''); // remove .js extension
        return moduleName.startsWith('@') // is this scoped?
          ? moduleName.replace(/(\/[^/]*).*/, '$1')
          : moduleName.replace(/\/.*/, '');
      }

      // iterate through imports
      Object.values(fileDeps).forEach(depList => {
        depList.forEach(dep => {
          const moduleName = npmName(dep); // is this an npm package?
          if (pkgManifest.dependencies[moduleName] && !arrayOfDeps.includes(moduleName)) {
            arrayOfDeps.push(moduleName); // if this is an npm package, add if it’s not in array
          }
        });
      });
      const timeEnd = process.hrtime(timeStart); // end perf benchmark

      const ms = timeEnd[0] + Math.round(timeEnd[1] / 1e6);
      depSpinner.succeed(
        `@pika/web resolved: ${arrayOfDeps.length} dependencies ${chalk.dim(
          `[${ms.toString()}ms]`,
        )}`,
      );
    } else {
      console.warn(chalk.yellow('No dependencies found in package.json to resolve'));
    }

    if (arrayOfDeps.length > 0) {
      doesWhitelistExist = true;
    } else {
      console.warn(chalk.yellow(`No npm dependencies found in ${entry} or imported files`));
    }
  }

  spinner.start();
  const startTime = Date.now();
  const result = await install(arrayOfDeps, {
    isCleanInstall: clean,
    dependencyTree,
    destLoc,
    namedExports,
    isExplicit: doesWhitelistExist,
    isStrict: strict,
    isBabel: babel || optimize,
    isOptimized: optimize,
    sourceMap,
    remoteUrl,
    hasBrowserlistConfig,
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
    // Set the exit code so that programmatic usage of the CLI knows that there were errors.
    spinner.warn(chalk(`Finished with warnings.`));
    process.exitCode = 1;
  }
}
