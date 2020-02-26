import babelPresetEnv from '@babel/preset-env';
import rollupPluginCommonjs from '@rollup/plugin-commonjs';
import rollupPluginJson from '@rollup/plugin-json';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginReplace from '@rollup/plugin-replace';
import chalk from 'chalk';
import fs from 'fs';
import hasha from 'hasha';
import isNodeBuiltin from 'is-builtin-module';
import mkdirp from 'mkdirp';
import ora from 'ora';
import path from 'path';
import rimraf from 'rimraf';
import {InputOptions, OutputOptions, Plugin, rollup, RollupError} from 'rollup';
import rollupPluginBabel from 'rollup-plugin-babel';
import {terser as rollupPluginTerser} from 'rollup-plugin-terser';
import validatePackageName from 'validate-npm-package-name';
import yargs from 'yargs-parser';
import loadConfig, {SnowpackConfig, CLIFlags} from './config.js';
import {resolveTargetsFromRemoteCDN} from './resolve-remote.js';
import {rollupPluginDependencyCache} from './rollup-plugin-remote-cdn.js';
import {rollupPluginEntrypointAlias} from './rollup-plugin-entrypoint-alias.js';
import {DependencyStatsOutput, rollupPluginDependencyStats} from './rollup-plugin-stats.js';
import {rollupPluginTreeshakeInputs} from './rollup-plugin-treeshake-inputs.js';
import {InstallTarget, scanDepList, scanImports} from './scan-imports.js';
import {printStats} from './stats-formatter.js';
import {
  ImportMap,
  isTruthy,
  MISSING_PLUGIN_SUGGESTIONS,
  readLockfile,
  resolveDependencyManifest,
  writeLockfile,
} from './util.js';

type InstallResult = 'SUCCESS' | 'ASSET' | 'FAIL';
interface DependencyLoc {
  type: 'JS' | 'ASSET';
  loc: string;
}

const ALWAYS_SHOW_ERRORS = new Set(['react', 'react-dom']);
const cwd = process.cwd();
const banner = chalk.bold(`snowpack`) + ` installing... `;
const installResults: [string, InstallResult][] = [];
let dependencyStats: DependencyStatsOutput | null = null;
let spinner = ora(banner);
let spinnerHasError = false;

function printHelp() {
  console.log(
    `
${chalk.bold(`snowpack`)} - Install npm dependencies to run natively on the web.
${chalk.bold('Options:')}
  --dest [path]             Specify destination directory (default: "web_modules/").
  --clean                   Clear out the destination directory before install.
  --optimize                Transpile, minify, and optimize installed dependencies for production.
  --babel                   Transpile installed dependencies. Also enabled with "--optimize".
  --include [glob]          Auto-detect imports from file(s). Supports glob.
  --exclude [glob]          Exclude files from --include. Follows glob’s ignore pattern.
  --strict                  Only install pure ESM dependency trees. Fail if a CJS module is encountered.
  --no-source-map           Skip emitting source map files (.js.map) into dest
  --stat                    Logs install statistics after installing, with information on install targets and file sizes. Useful for CI, performance review.
  --nomodule [path]         Your app’s entry file for generating a <script nomodule> bundle
  --nomodule-output [path]  Filename for nomodule output (default: 'app.nomodule.js')
    ${chalk.bold('Advanced:')}
  --external-package [val]  Internal use only, may be removed at any time.
    `.trim(),
  );
}

async function generateHashFromFile(targetLoc: string) {
  const longHash = await hasha.fromFile(targetLoc, {algorithm: 'md5'});
  return longHash?.slice(0, 10);
}

function formatInstallResults(skipFailures: boolean): string {
  return installResults
    .map(([d, result]) => {
      if (result === 'SUCCESS') {
        return chalk.green(d);
      }
      if (result === 'ASSET') {
        return chalk.yellow(d);
      }
      if (result === 'FAIL') {
        return skipFailures ? chalk.dim(d) : chalk.red(d);
      }
      return d;
    })
    .join(', ');
}

function logError(msg: string) {
  if (!spinnerHasError) {
    spinner.stopAndPersist({symbol: chalk.cyan('⠼')});
  }
  spinnerHasError = true;
  spinner = ora(chalk.red(msg));
  spinner.fail();
}

function logUpdate(msg: string) {
  spinner.text = banner + msg;
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
  path.join('scheduler', 'index.js'),
  path.join('rxjs', 'Rx.js'),
];

function detectExports(filePath: string): string[] | undefined {
  try {
    const fileLoc = require.resolve(filePath, {paths: [cwd]});
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
  // if dep includes a file extension, check that dep isn't a package before returning
  if (path.extname(dep) && !validatePackageName(dep).validForNewPackages) {
    const isJSFile = ['.js', '.mjs', '.cjs'].includes(path.extname(dep));
    return {
      type: isJSFile ? 'JS' : 'ASSET',
      loc: require.resolve(dep, {paths: [cwd]}),
    };
  }
  const [depManifestLoc, depManifest] = resolveDependencyManifest(dep, cwd);
  if (!depManifest) {
    throw new ErrorWithHint(
      `"${dep}" not found. Have you installed the package via npm?`,
      depManifestLoc && chalk.italic(depManifestLoc),
    );
  }
  let foundEntrypoint: string =
    depManifest['browser:module'] ||
    depManifest.module ||
    depManifest['main:esnext'] ||
    depManifest.browser;
  // Some packages define "browser" as an object. We'll do our best to find the
  // right entrypoint in an entrypoint object, or fail otherwise.
  // See: https://github.com/defunctzombie/package-browser-field-spec
  if (typeof foundEntrypoint === 'object') {
    foundEntrypoint =
      foundEntrypoint[dep] ||
      foundEntrypoint['./index.js'] ||
      foundEntrypoint['./index'] ||
      foundEntrypoint['./'] ||
      foundEntrypoint['.'] ||
      foundEntrypoint;
  }
  // If the package was a part of the explicit whitelist, fallback to it's main CJS entrypoint.
  if (!foundEntrypoint && isExplicit) {
    foundEntrypoint = depManifest.main || 'index.js';
  }
  if (
    (dep === 'react' || dep === 'react-dom') &&
    (!foundEntrypoint || foundEntrypoint === 'index.js')
  ) {
    throw new ErrorWithHint(
      chalk.bold(`Dependency "${dep}" has no native "module" entrypoint.`) +
        `
  To continue, install our drop-in, ESM-ready builds of "react" & "react-dom" to your project:
    npm: npm install react@npm:@pika/react react-dom@npm:@pika/react-dom
    yarn: yarn add react@npm:@pika/react react-dom@npm:@pika/react-dom`,
      chalk.italic(`See ${chalk.underline('https://www.snowpack.dev/#react')} for more info.`),
    );
  }
  if (!foundEntrypoint) {
    throw new ErrorWithHint(
      `dependency "${dep}" has no native "module" entrypoint.`,
      chalk.italic(
        `Tip: Find modern, web-ready packages at ${chalk.underline('https://www.pika.dev')}`,
      ),
    );
  }
  if (typeof foundEntrypoint !== 'string') {
    throw new Error(`"${dep}" has unexpected entrypoint: ${JSON.stringify(foundEntrypoint)}.`);
  }
  return {
    type: 'JS',
    loc: path.join(depManifestLoc, '..', foundEntrypoint),
  };
}

/**
 * Formats the snowpack dependency name from a "webDependencies" input value:
 * 2. Remove any ".js"/".mjs" extension (will be added automatically by Rollup)
 */
function getWebDependencyName(dep: string): string {
  return dep.replace(/\.m?js$/i, '');
}

interface InstallOptions {
  hasBrowserlistConfig: boolean;
  isExplicit: boolean;
  lockfile: ImportMap | null;
}

export async function install(
  installTargets: InstallTarget[],
  {hasBrowserlistConfig, isExplicit, lockfile}: InstallOptions,
  config: SnowpackConfig,
) {
  const {
    dedupe,
    namedExports,
    source,
    installOptions: {
      babel: isBabel,
      dest: destLoc,
      hash: useHash,
      externalPackage: externalPackages,
      nomodule,
      nomoduleOutput,
      optimize: isOptimized,
      sourceMap,
      strict: isStrict,
      stat: withStats,
    },
    rollup: userDefinedRollup,
  } = config;

  const knownNamedExports = {...namedExports};
  for (const filePath of PACKAGES_TO_AUTO_DETECT_EXPORTS) {
    knownNamedExports[filePath] = knownNamedExports[filePath] || detectExports(filePath) || [];
  }
  if (source === 'local' && !fs.existsSync(path.join(cwd, 'node_modules'))) {
    logError('no "node_modules" directory exists. Did you run "npm install" first?');
    return;
  }

  const allInstallSpecifiers = new Set(installTargets.map(dep => dep.specifier).sort());
  const installEntrypoints: {[targetName: string]: string} = {};
  const assetEntrypoints: {[targetName: string]: string} = {};
  const importMap: ImportMap = {imports: {}};
  const installTargetsMap: {[targetLoc: string]: InstallTarget[]} = {};
  const skipFailures = !isExplicit;

  for (const installSpecifier of allInstallSpecifiers) {
    const targetName = getWebDependencyName(installSpecifier);
    if (lockfile && lockfile.imports[installSpecifier]) {
      installEntrypoints[targetName] = lockfile.imports[installSpecifier];
      importMap.imports[installSpecifier] = `./${targetName}.js`;
      installResults.push([targetName, 'SUCCESS']);
      logUpdate(formatInstallResults(skipFailures));
      continue;
    }
    try {
      const {type: targetType, loc: targetLoc} = resolveWebDependency(installSpecifier, isExplicit);
      if (targetType === 'JS') {
        const hashQs = useHash ? `?rev=${await generateHashFromFile(targetLoc)}` : '';
        installEntrypoints[targetName] = targetLoc;
        importMap.imports[installSpecifier] = `./${targetName}.js${hashQs}`;
        installTargetsMap[targetLoc] = installTargets.filter(t => installSpecifier === t.specifier);
        installResults.push([installSpecifier, 'SUCCESS']);
      } else if (targetType === 'ASSET') {
        assetEntrypoints[targetName] = targetLoc;
        installResults.push([installSpecifier, 'ASSET']);
      }
      logUpdate(formatInstallResults(skipFailures));
    } catch (err) {
      installResults.push([installSpecifier, 'FAIL']);
      logUpdate(formatInstallResults(skipFailures));
      if (skipFailures && !ALWAYS_SHOW_ERRORS.has(installSpecifier)) {
        continue;
      }
      // An error occurred! Log it.
      logError(err.message || err);
      if (err.hint) {
        // Note: Wait 1ms to guarantee a log message after the spinner
        setTimeout(() => console.log(err.hint), 1);
      }
      return false;
    }
  }
  if (Object.keys(installEntrypoints).length === 0 && Object.keys(assetEntrypoints).length === 0) {
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

  const inputOptions: InputOptions = {
    input: installEntrypoints,
    external: externalPackages,
    plugins: [
      rollupPluginEntrypointAlias({cwd}),
      source === 'pika' && rollupPluginDependencyCache(),
      !isStrict &&
        rollupPluginReplace({
          'process.env.NODE_ENV': isOptimized ? '"production"' : '"development"',
        }),
      rollupPluginNodeResolve({
        mainFields: ['browser:module', 'module', 'browser', !isStrict && 'main'].filter(isTruthy),
        modulesOnly: isStrict, // Default: false
        extensions: ['.mjs', '.cjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: false, // Default: true
        dedupe,
      }),
      !isStrict &&
        rollupPluginJson({
          preferConst: true,
          indent: '  ',
          compact: isOptimized,
          namedExports: true,
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
          configFile: false,
          presets: [
            [
              babelPresetEnv,
              {
                modules: false,
                targets: hasBrowserlistConfig
                  ? undefined
                  : '>0.75%, not ie 11, not UCAndroid >0, not OperaMini all',
              },
            ],
          ],
        }),
      !!isOptimized && rollupPluginTreeshakeInputs(installTargets),
      !!isOptimized && rollupPluginTerser(),
      !!withStats && rollupPluginDependencyStats(info => (dependencyStats = info)),
      ...userDefinedRollup.plugins, // load user-defined plugins last
    ],
    onwarn(warning, warn) {
      if (warning.code === 'UNRESOLVED_IMPORT') {
        logError(
          `'${warning.source}' is imported by '${warning.importer}', but could not be resolved.`,
        );
        if (isNodeBuiltin(warning.source)) {
          console.log(
            chalk.dim(
              `  '${warning.source}' is a Node.js builtin module that won't exist in the browser.`,
            ),
          );
          console.log(
            chalk.dim(
              `  Find a more web-friendly alternative, or add the "rollup-plugin-node-polyfills" plugin to your Snowpack config file.`,
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
    },
  };
  const outputOptions: OutputOptions = {
    dir: destLoc,
    format: 'esm',
    sourcemap: sourceMap ?? isOptimized,
    exports: 'named',
    chunkFileNames: 'common/[name]-[hash].js',
  };
  if (Object.keys(installEntrypoints).length > 0) {
    try {
      const packageBundle = await rollup(inputOptions);
      await packageBundle.write(outputOptions);
    } catch (err) {
      const {loc} = err as RollupError;
      if (!loc || !loc.file) {
        throw err;
      }
      // NOTE: Rollup will fail instantly on error. Because of that, we can
      // only report one error at a time. `err.watchFiles` also exists, but
      // for now `err.loc.file` has all the information that we need.
      const failedExtension = path.extname(loc.file);
      const suggestion = MISSING_PLUGIN_SUGGESTIONS[failedExtension];
      if (!suggestion) {
        throw err;
      }
      // Display posix-style on all environments, mainly to help with CI :)
      const fileName = loc.file.replace(cwd + path.sep, '').replace(/\\/g, '/');
      logError(`${chalk.bold('snowpack')} could not import ${fileName}. ${suggestion}`);
      return;
    }
  }

  if (nomodule) {
    const nomoduleStart = Date.now();
    function rollupResolutionHelper(): Plugin {
      return {
        name: 'rename-import-plugin',
        resolveId(source) {
          // resolve from import map
          if (importMap.imports[source]) {
            return importMap.imports[source];
          }
          // resolve web_modules
          if (source.includes('/web_modules/')) {
            const suffix = source.split('/web_modules/')[1];
            return {id: path.join(destLoc, suffix)};
          }
          // null means try to resolve as-is
          return null;
        },
      };
    }
    try {
      const noModuleBundle = await rollup({
        input: path.resolve(cwd, nomodule),
        inlineDynamicImports: true,
        plugins: [...inputOptions.plugins!, rollupResolutionHelper()],
      });
      await noModuleBundle.write({
        file: path.resolve(destLoc, nomoduleOutput),
        format: 'iife',
        name: 'App',
      });
      const nomoduleEnd = Date.now() - nomoduleStart;
      spinner.info(
        `${chalk.bold(
          'snowpack',
        )} bundled your application for legacy browsers: ${nomoduleOutput} ${chalk.dim(
          `[${(nomoduleEnd / 1000).toFixed(2)}s]`,
        )}`,
      );
    } catch (err) {
      spinner.warn(
        `${chalk.bold('snowpack')} encountered an error bundling for legacy browsers: ${
          err.message
        }`,
      );
    }
  }
  await writeLockfile(path.join(destLoc, 'import-map.json'), importMap);
  Object.entries(assetEntrypoints).forEach(([assetName, assetLoc]) => {
    mkdirp.sync(path.dirname(`${destLoc}/${assetName}`));
    fs.copyFileSync(assetLoc, `${destLoc}/${assetName}`);
  });
  return true;
}

export async function cli(args: string[]) {
  // parse CLI flags
  const cliFlags = yargs(args, {array: ['exclude', 'externalPackage']}) as CLIFlags;

  // if printing help, stop here
  if (cliFlags.help) {
    printHelp();
    process.exit(0);
  }

  // load config
  const {config, errors} = loadConfig(cliFlags);

  // handle config errors (if any)
  if (Array.isArray(errors) && errors.length) {
    errors.forEach(logError);
    process.exit(0);
  }

  // load lockfile
  let lockfile = await readLockfile(cwd);
  let newLockfile: ImportMap | null = null;

  const {
    installOptions: {clean, dest, exclude, include},
    webDependencies,
    source,
  } = config;

  let pkgManifest: any;
  try {
    pkgManifest = require(path.join(cwd, 'package.json'));
  } catch (err) {
    console.log(chalk.red('[ERROR] package.json required but no file was found.'));
    process.exit(0);
  }

  const implicitDependencies = [
    ...Object.keys(pkgManifest.peerDependencies || {}),
    ...Object.keys(pkgManifest.dependencies || {}),
  ];
  const hasBrowserlistConfig =
    !!pkgManifest.browserslist ||
    !!process.env.BROWSERSLIST ||
    fs.existsSync(path.join(cwd, '.browserslistrc')) ||
    fs.existsSync(path.join(cwd, 'browserslist'));

  let isExplicit = false;
  const installTargets: InstallTarget[] = [];

  if (webDependencies) {
    isExplicit = true;
    installTargets.push(...scanDepList(webDependencies, cwd));
  }
  if (include) {
    isExplicit = true;
    installTargets.push(...(await scanImports({include, exclude})));
  }
  if (!webDependencies && !include) {
    installTargets.push(...scanDepList(implicitDependencies, cwd));
  }
  if (installTargets.length === 0) {
    logError('Nothing to install.');
    return;
  }

  spinner.start();
  const startTime = Date.now();
  if (source === 'pika') {
    newLockfile = await resolveTargetsFromRemoteCDN(installTargets, lockfile, pkgManifest, config);
  }

  if (clean) {
    rimraf.sync(dest);
  }
  await mkdirp(dest);
  const finalResult = await install(
    installTargets,
    {hasBrowserlistConfig, isExplicit, lockfile: newLockfile},
    config,
  ).catch(err => {
    err.loc && console.log('\n' + chalk.red.bold(`✘ ${err.loc.file}`));
    throw err;
  });

  if (finalResult) {
    spinner.succeed(
      chalk.bold(`snowpack`) +
        ` installed: ` +
        formatInstallResults(!isExplicit) +
        '.' +
        chalk.dim(` [${((Date.now() - startTime) / 1000).toFixed(2)}s]`),
    );
    if (!!dependencyStats) {
      console.log(printStats(dependencyStats));
    }
  }

  if (newLockfile) {
    await writeLockfile(path.join(cwd, 'snowpack.lock.json'), newLockfile);
  }

  // If an error happened, set the exit code so that programmatic usage of the CLI knows.
  // We were seeing race conditions here, so add a little buffer.
  if (spinnerHasError) {
    setTimeout(() => {
      spinner.warn(chalk(`Finished with warnings.`));
      process.exitCode = 1;
    }, 20);
  }
}
