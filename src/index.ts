import rollupPluginAlias from '@rollup/plugin-alias';
import rollupPluginCommonjs from '@rollup/plugin-commonjs';
import rollupPluginJson from '@rollup/plugin-json';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginReplace from '@rollup/plugin-replace';
import chalk from 'chalk';
import fs from 'fs';
import isNodeBuiltin from 'is-builtin-module';
import mkdirp from 'mkdirp';
import ora from 'ora';
import path from 'path';
import rimraf from 'rimraf';
import {InputOptions, OutputOptions, rollup, RollupError} from 'rollup';
import validatePackageName from 'validate-npm-package-name';
import yargs from 'yargs-parser';
import {command as buildCommand} from './commands/build';
import {command as devCommand} from './commands/dev';
import {CLIFlags, EnvVarReplacements, loadAndValidateConfig, SnowpackConfig} from './config.js';
import {clearCache, resolveTargetsFromRemoteCDN} from './resolve-remote.js';
import {rollupPluginEntrypointAlias} from './rollup-plugin-entrypoint-alias.js';
import {rollupPluginDependencyCache} from './rollup-plugin-remote-cdn.js';
import {DependencyStatsOutput, rollupPluginDependencyStats} from './rollup-plugin-stats.js';
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
import {rollupPluginReactFix} from './rollup-plugin-react-fix';

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
    `.trim(),
  );
}

function formatInstallResults(): string {
  return installResults
    .map(([d, result]) => {
      if (result === 'SUCCESS') {
        return chalk.green(d);
      }
      if (result === 'ASSET') {
        return chalk.yellow(d);
      }
      if (result === 'FAIL') {
        return chalk.red(d);
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
  'react-is',
  'prop-types',
  'scheduler',
  'rxjs',
  'exenv',
  'body-scroll-lock',
];

function detectExports(filePath: string): string[] | undefined {
  try {
    const fileLoc = require.resolve(filePath, {paths: [cwd]});
    if (fs.existsSync(fileLoc)) {
      return Object.keys(require(fileLoc)).filter((e) => e[0] !== '_');
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
  if (
    depManifest.name &&
    (depManifest.name.startsWith('@reactesm') || depManifest.name.startsWith('@pika/react'))
  ) {
    throw new Error(
      `React workaround packages no longer needed! Revert back to the official React & React-DOM packages.`,
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
      foundEntrypoint['.'];
  }
  // If the package was a part of the explicit whitelist, fallback to it's main CJS entrypoint.
  if (!foundEntrypoint && isExplicit) {
    foundEntrypoint = depManifest.main || 'index.js';
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

/**
 * Takes object of env var mappings and converts it to actual
 * replacement specs as expected by @rollup/plugin-replace. The
 * `optimize` arg is used to derive NODE_ENV default.
 *
 * @param env
 * @param optimize
 */
function getRollupReplaceKeys(env: EnvVarReplacements): Record<string, string> {
  const result = Object.keys(env).reduce(
    (acc, id) => {
      const val = env[id];
      acc[`process.env.${id}`] = `${JSON.stringify(val === true ? process.env[id] : val)}`;
      return acc;
    },
    {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.': '({}).',
    },
  );
  return result;
}

interface InstallOptions {
  hasBrowserlistConfig: boolean;
  lockfile: ImportMap | null;
}

export async function install(
  installTargets: InstallTarget[],
  {hasBrowserlistConfig, lockfile}: InstallOptions,
  config: SnowpackConfig,
) {
  const {
    webDependencies,
    installOptions: {
      installTypes,
      dest: destLoc,
      externalPackage: externalPackages,
      alias: installAlias,
      sourceMap,
      env,
      rollup: userDefinedRollup,
    },
  } = config;

  const knownNamedExports = {...userDefinedRollup.namedExports};
  for (const filePath of PACKAGES_TO_AUTO_DETECT_EXPORTS) {
    knownNamedExports[filePath] = knownNamedExports[filePath] || detectExports(filePath) || [];
  }
  if (!webDependencies && !fs.existsSync(path.join(cwd, 'node_modules'))) {
    logError('no "node_modules" directory exists. Did you run "npm install" first?');
    return;
  }
  const allInstallSpecifiers = new Set(
    installTargets
      .map((dep) => dep.specifier)
      .map((specifier) => installAlias[specifier] || specifier)
      .sort(),
  );
  const installEntrypoints: {[targetName: string]: string} = {};
  const assetEntrypoints: {[targetName: string]: string} = {};
  const importMap: ImportMap = {imports: {}};
  const installTargetsMap: {[targetLoc: string]: InstallTarget[]} = {};
  const skipFailures = false;

  for (const installSpecifier of allInstallSpecifiers) {
    const targetName = getWebDependencyName(installSpecifier);
    if (lockfile && lockfile.imports[installSpecifier]) {
      installEntrypoints[targetName] = lockfile.imports[installSpecifier];
      importMap.imports[installSpecifier] = `./${targetName}.js`;
      installResults.push([targetName, 'SUCCESS']);
      logUpdate(formatInstallResults());
      continue;
    }
    try {
      const {type: targetType, loc: targetLoc} = resolveWebDependency(installSpecifier, true);
      if (targetType === 'JS') {
        installEntrypoints[targetName] = targetLoc;
        importMap.imports[installSpecifier] = `./${targetName}.js`;
        Object.entries(installAlias)
          .filter(([key, value]) => value === installSpecifier)
          .forEach(([key, value]) => {
            importMap.imports[key] = `./${targetName}.js`;
          });
        installTargetsMap[targetLoc] = installTargets.filter(
          (t) => installSpecifier === t.specifier,
        );
        installResults.push([installSpecifier, 'SUCCESS']);
      } else if (targetType === 'ASSET') {
        assetEntrypoints[targetName] = targetLoc;
        installResults.push([installSpecifier, 'ASSET']);
      }
      logUpdate(formatInstallResults());
    } catch (err) {
      installResults.push([installSpecifier, 'FAIL']);
      logUpdate(formatInstallResults());
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
    treeshake: {moduleSideEffects: 'no-external'},
    plugins: [
      rollupPluginReplace(getRollupReplaceKeys(env)),
      rollupPluginEntrypointAlias({cwd}),
      !!webDependencies &&
        rollupPluginDependencyCache({
          installTypes,
          log: (url) => logUpdate(chalk.dim(url)),
        }),
      rollupPluginAlias({
        entries: Object.entries(installAlias).map(([alias, mod]) => ({
          find: alias,
          replacement: mod,
        })),
      }),
      rollupPluginNodeResolve({
        mainFields: ['browser:module', 'module', 'browser', 'main'].filter(isTruthy),
        extensions: ['.mjs', '.cjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: false, // Default: true
        dedupe: userDefinedRollup.dedupe,
      }),
      rollupPluginJson({
        preferConst: true,
        indent: '  ',
        compact: false,
        namedExports: true,
      }),
      rollupPluginCommonjs({
        extensions: ['.js', '.cjs'], // Default: [ '.js' ]
        namedExports: knownNamedExports,
      }),
      rollupPluginDependencyStats((info) => (dependencyStats = info)),
      rollupPluginReactFix(),
      ...userDefinedRollup.plugins, // load user-defined plugins last
    ].filter(Boolean) as Plugin[],
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
    sourcemap: sourceMap,
    exports: 'named',
    chunkFileNames: 'common/[name]-[hash].js',
  };
  if (Object.keys(installEntrypoints).length > 0) {
    try {
      const packageBundle = await rollup(inputOptions);
      logUpdate(formatInstallResults());
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

  await writeLockfile(path.join(destLoc, 'import-map.json'), importMap);
  Object.entries(assetEntrypoints).forEach(([assetName, assetLoc]) => {
    mkdirp.sync(path.dirname(`${destLoc}/${assetName}`));
    fs.copyFileSync(assetLoc, `${destLoc}/${assetName}`);
  });
  return true;
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
  if (cliFlags['_'].length > 3) {
    console.log(`Unexpected multiple commands`);
    process.exit(1);
  }

  // Load the current package manifest
  let pkgManifest: any;
  try {
    pkgManifest = require(path.join(cwd, 'package.json'));
  } catch (err) {
    console.log(chalk.red('[ERROR] package.json required but no file was found.'));
    process.exit(1);
  }

  // load config
  const config = loadAndValidateConfig(cliFlags, pkgManifest);

  // load lockfile
  let lockfile = await readLockfile(cwd);
  let newLockfile: ImportMap | null = null;

  if (cliFlags['_'][2] === 'build') {
    await buildCommand({
      cwd,
      config,
    });
    return;
  }

  if (cliFlags['_'][2] === 'dev') {
    await devCommand({
      cwd,
      config,
    });
    return;
  }

  const {
    exclude,
    scripts,
    installOptions: {dest},
    knownEntrypoints,
    webDependencies,
  } = config;

  const hasBrowserlistConfig =
    !!pkgManifest.browserslist ||
    !!process.env.BROWSERSLIST ||
    fs.existsSync(path.join(cwd, '.browserslistrc')) ||
    fs.existsSync(path.join(cwd, 'browserslist'));

  const installTargets: InstallTarget[] = [];

  if (knownEntrypoints) {
    installTargets.push(...scanDepList(knownEntrypoints, cwd));
  }
  if (webDependencies) {
    installTargets.push(...scanDepList(Object.keys(webDependencies), cwd));
  }
  {
    installTargets.push(...(await scanImports(cwd, config)));
  }
  if (installTargets.length === 0) {
    logError('Nothing to install.');
    return;
  }

  spinner.start();
  const startTime = Date.now();
  if (webDependencies && Object.keys(webDependencies).length > 0) {
    newLockfile = await resolveTargetsFromRemoteCDN(lockfile, pkgManifest, config).catch((err) => {
      logError(err.message || err);
      process.exit(1);
    });
  }

  rimraf.sync(dest);
  await mkdirp(dest);
  const finalResult = await install(
    installTargets,
    {hasBrowserlistConfig, lockfile: newLockfile},
    config,
  ).catch((err) => {
    if (err.loc) {
      console.log('\n' + chalk.red.bold(`✘ ${err.loc.file}`));
    }
    if (err.url) {
      console.log(chalk.dim(`👉 ${err.url}`));
    }
    throw err;
  });

  if (finalResult) {
    spinner.succeed(
      chalk.bold(`snowpack`) +
        ` install complete.` +
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
