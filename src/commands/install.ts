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
import {EnvVarReplacements, SnowpackConfig} from '../config.js';
import {resolveTargetsFromRemoteCDN} from '../resolve-remote.js';
import {rollupPluginCss} from '../rollup-plugin-css';
import {rollupPluginEntrypointAlias} from '../rollup-plugin-entrypoint-alias.js';
import {rollupPluginReactFix} from '../rollup-plugin-react-fix';
import {rollupPluginDependencyCache} from '../rollup-plugin-remote-cdn.js';
import {DependencyStatsOutput, rollupPluginDependencyStats} from '../rollup-plugin-stats.js';
import {InstallTarget, scanDepList, scanImports} from '../scan-imports.js';
import {printStats} from '../stats-formatter.js';
import {
  CommandOptions,
  ImportMap,
  isTruthy,
  MISSING_PLUGIN_SUGGESTIONS,
  resolveDependencyManifest,
  updateLockfileHash,
  writeLockfile,
} from '../util.js';

type InstallResult = 'SUCCESS' | 'ASSET' | 'FAIL';

interface DependencyLoc {
  type: 'JS' | 'ASSET';
  loc: string;
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

const cwd = process.cwd();
const banner = chalk.bold(`snowpack`) + ` installing... `;
let spinner = ora(banner);
let spinnerHasError = false;
let installResults: [string, InstallResult][] = [];
let dependencyStats: DependencyStatsOutput | null = null;

function defaultLogError(msg: string) {
  if (!spinnerHasError) {
    spinner.stopAndPersist({symbol: chalk.cyan('⠼')});
  }
  spinnerHasError = true;
  spinner = ora(chalk.red(msg));
  spinner.fail();
}

function defaultLogUpdate(msg: string) {
  spinner.text = banner + msg;
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

function detectExports(filePath: string): string[] {
  try {
    const fileLoc = require.resolve(filePath, {paths: [cwd]});
    if (fs.existsSync(fileLoc)) {
      return Object.keys(require(fileLoc));
    }
  } catch (err) {
    // ignore
  }
  return [];
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
      'process.platform': JSON.stringify('browser'),
      'process.env.': '({}).',
    },
  );
  return result;
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
  // Fix: import '@material-ui/icons/AddBox' could be a JS file w/o a file extension.
  // Check Node's resolution logic in case this is actually a file.
  if (!depManifest) {
    try {
      const maybeLoc = require.resolve(dep, {paths: [cwd]});
      return {
        type: 'JS',
        loc: maybeLoc,
      };
    } catch (err) {
      // Oh well, was worth a try
    }
  }
  if (!depManifest) {
    throw new ErrorWithHint(
      `Package "${dep}" not found. Have you installed it?`,
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

interface InstallOptions {
  lockfile: ImportMap | null;
  logError: (msg: string) => void;
  logUpdate: (msg: string) => void;
}

export async function install(
  installTargets: InstallTarget[],
  {lockfile, logError, logUpdate}: InstallOptions,
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
    knownNamedExports[filePath] = [
      ...(knownNamedExports[filePath] || []),
      ...detectExports(filePath),
    ];
  }
  // @ts-ignore
  if (!webDependencies && !process.versions.pnp && !fs.existsSync(path.join(cwd, 'node_modules'))) {
    logError('no "node_modules" directory exists. Did you run "npm install" first?');
    return;
  }
  const allInstallSpecifiers = new Set(
    installTargets
      .filter((dep) => !externalPackages.includes(dep.specifier))
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
        importMap.imports[installSpecifier] = `./${targetName}`;
        installResults.push([installSpecifier, 'ASSET']);
      }
      logUpdate(formatInstallResults());
    } catch (err) {
      installResults.push([installSpecifier, 'FAIL']);
      logUpdate(formatInstallResults());
      if (skipFailures) {
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

  let isCircularImportFound = false;
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
      rollupPluginCss(),
      rollupPluginCommonjs({
        extensions: ['.js', '.cjs'], // Default: [ '.js' ]
        namedExports: knownNamedExports,
      }),
      rollupPluginDependencyStats((info) => (dependencyStats = info)),
      rollupPluginReactFix(),
      ...userDefinedRollup.plugins, // load user-defined plugins last
    ].filter(Boolean) as Plugin[],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        if (!isCircularImportFound) {
          isCircularImportFound = true;
          logUpdate(`Warning: 1+ circular dependencies found via "${warning.importer}".`);
        }
        return;
      }
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
    } catch (_err) {
      const err: RollupError = _err;
      const errFilePath = err.loc?.file || err.id;
      if (!errFilePath) {
        throw err;
      }
      // NOTE: Rollup will fail instantly on most errors. Therefore, we can
      // only report one error at a time. `err.watchFiles` also exists, but
      // for now `err.loc.file` and `err.id` have all the info that we need.
      const failedExtension = path.extname(errFilePath);
      const suggestion = MISSING_PLUGIN_SUGGESTIONS[failedExtension] || err.message;
      // Display posix-style on all environments, mainly to help with CI :)
      const fileName = errFilePath.replace(cwd + path.sep, '').replace(/\\/g, '/');
      logError(`${chalk.bold('snowpack')} failed to load ${chalk.bold(fileName)}\n  ${suggestion}`);
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

export async function command({cwd, config, lockfile, pkgManifest}: CommandOptions) {
  const {
    installOptions: {dest},
    knownEntrypoints,
    webDependencies,
  } = config;

  installResults = [];
  dependencyStats = null;
  spinner = ora(banner);
  spinnerHasError = false;

  let newLockfile: ImportMap | null = null;
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
    defaultLogError('Nothing to install.');
    return;
  }

  spinner.start();
  const startTime = Date.now();
  if (webDependencies && Object.keys(webDependencies).length > 0) {
    newLockfile = await resolveTargetsFromRemoteCDN(lockfile, pkgManifest, config).catch((err) => {
      defaultLogError(err.message || err);
      process.exit(1);
    });
  }

  rimraf.sync(dest);
  await mkdirp(dest);
  const finalResult = await install(
    installTargets,
    {
      lockfile: newLockfile,
      logError: defaultLogError,
      logUpdate: defaultLogUpdate,
    },
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

  await updateLockfileHash();
  if (newLockfile) {
    await writeLockfile(path.join(cwd, 'snowpack.lock.json'), newLockfile);
  }

  if (spinnerHasError) {
    process.exit(1);
  }
}
