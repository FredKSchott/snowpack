import rollupPluginAlias from '@rollup/plugin-alias';
import rollupPluginCommonjs, {RollupCommonJSOptions} from '@rollup/plugin-commonjs';
import rollupPluginJson from '@rollup/plugin-json';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginReplace from '@rollup/plugin-replace';
import esbuild from 'rollup-plugin-esbuild';
import {init as initESModuleLexer} from 'es-module-lexer';
import findUp from 'find-up';
import fs from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import ora from 'ora';
import path from 'path';
import rimraf from 'rimraf';
import {InputOptions, OutputOptions, rollup, RollupError} from 'rollup';
import validatePackageName from 'validate-npm-package-name';
import {EnvVarReplacements, SnowpackConfig, SnowpackSourceFile} from '../config.js';
import {resolveTargetsFromRemoteCDN} from '../resolve-remote.js';
import {rollupPluginCatchUnresolved} from '../rollup-plugins/rollup-plugin-catch-unresolved.js';
import {rollupPluginCatchFetch} from '../rollup-plugins/rollup-plugin-catch-fetch';
import {rollupPluginCss} from '../rollup-plugins/rollup-plugin-css';
import {rollupPluginDependencyCache} from '../rollup-plugins/rollup-plugin-remote-cdn.js';
import {
  DependencyStatsOutput,
  rollupPluginDependencyStats,
} from '../rollup-plugins/rollup-plugin-stats.js';
import {rollupPluginWrapInstallTargets} from '../rollup-plugins/rollup-plugin-wrap-install-targets';
import {InstallTarget, scanDepList, scanImports, scanImportsFromFiles} from '../scan-imports.js';
import {printStats} from '../stats-formatter.js';
import {
  CommandOptions,
  ImportMap,
  isTruthy,
  MISSING_PLUGIN_SUGGESTIONS,
  parsePackageImportSpecifier,
  resolveDependencyManifest,
  sanitizePackageName,
  writeLockfile,
} from '../util.js';

type InstallResultCode = 'SUCCESS' | 'ASSET' | 'FAIL';

interface DependencyLoc {
  type: 'JS' | 'ASSET' | 'IGNORE';
  loc: string;
}

class ErrorWithHint extends Error {
  constructor(message: string, public readonly hint: string) {
    super(message);
  }
}

// Add popular CJS packages here that use "synthetic" named imports in their documentation.
// CJS packages should really only be imported via the default export:
//   import React from 'react';
// But, some large projects use named exports in their documentation:
//   import {useState} from 'react';
//
// We use "/index.js here to match the official package, but not any ESM aliase packages
// that the user may have installed instead (ex: react-esm).
const CJS_PACKAGES_TO_AUTO_DETECT = [
  'react/index.js',
  'react-dom/index.js',
  'react-dom/server.js',
  'react-is/index.js',
  'prop-types/index.js',
  'scheduler/index.js',
  'react-table',
];

const cwd = process.cwd();
const banner = colors.bold(`snowpack`) + ` installing... `;
let spinner;
let spinnerHasError = false;
let installResults: [string, InstallResultCode][] = [];
let dependencyStats: DependencyStatsOutput | null = null;

function defaultLogError(msg: string) {
  if (spinner && !spinnerHasError) {
    spinner.stopAndPersist({symbol: colors.cyan('⠼')});
  }
  spinnerHasError = true;
  spinner = ora(colors.red(msg));
  spinner.fail();
}

function defaultLogUpdate(msg: string) {
  spinner.text = banner + msg;
}

function formatInstallResults(): string {
  return installResults
    .map(([d, result]) => {
      if (result === 'SUCCESS') {
        return colors.green(d);
      }
      if (result === 'ASSET') {
        return colors.yellow(d);
      }
      if (result === 'FAIL') {
        return colors.red(d);
      }
      return d;
    })
    .join(', ');
}

function isImportOfPackage(importUrl: string, packageName: string) {
  return packageName === importUrl || importUrl.startsWith(packageName + '/');
}

/**
 * Formats the snowpack dependency name from a "webDependencies" input value:
 * 2. Remove any ".js"/".mjs" extension (will be added automatically by Rollup)
 */
function getWebDependencyName(dep: string): string {
  return validatePackageName(dep).validForNewPackages
    ? dep.replace(/\.js$/i, 'js') // if this is a top-level package ending in .js, replace with js (e.g. tippy.js -> tippyjs)
    : dep.replace(/\.m?js$/i, ''); // otherwise simply strip the extension (Rollup will resolve it)
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
      'process.versions.node': 'undefined',
      'process.platform': JSON.stringify('browser'),
      'process.env.': '({}).',
      'typeof process': JSON.stringify('undefined'),
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
function resolveWebDependency(dep: string): DependencyLoc {
  // if dep points directly to a file within a package, return that reference.
  // No other lookup required.
  if (path.extname(dep) && !validatePackageName(dep).validForNewPackages) {
    const isJSFile = ['.js', '.mjs', '.cjs'].includes(path.extname(dep));
    return {
      type: isJSFile ? 'JS' : 'ASSET',
      loc: require.resolve(dep, {paths: [cwd]}),
    };
  }
  // If dep is a path within a package (but without an extension), we first need
  // to check for an export map in the package.json. If one exists, resolve to it.
  const [packageName, packageEntrypoint] = parsePackageImportSpecifier(dep);
  if (packageEntrypoint) {
    const [packageManifestLoc, packageManifest] = resolveDependencyManifest(packageName, cwd);
    if (packageManifestLoc && packageManifest && packageManifest.exports) {
      const exportMapEntry = packageManifest.exports['./' + packageEntrypoint];
      const exportMapValue =
        exportMapEntry?.browser ||
        exportMapEntry?.import ||
        exportMapEntry?.default ||
        exportMapEntry?.require ||
        exportMapEntry;
      if (typeof exportMapValue !== 'string') {
        throw new Error(
          `Package "${packageName}" exists but package.json "exports" does not include entry for "./${packageEntrypoint}".`,
        );
      }
      return {
        type: 'JS',
        loc: path.join(packageManifestLoc, '..', exportMapValue),
      };
    }
  }

  // Otherwise, resolve directly to the dep specifier. Note that this supports both
  // "package-name" & "package-name/some/path" where "package-name/some/path/package.json"
  // exists at that lower path, that must be used to resolve. In that case, export
  // maps should not be supported.
  const [depManifestLoc, depManifest] = resolveDependencyManifest(dep, cwd);
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
  if (!depManifestLoc || !depManifest) {
    throw new ErrorWithHint(
      `Package "${dep}" not found. Have you installed it?`,
      depManifestLoc ? colors.italic(depManifestLoc) : '',
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
  // If browser object is set but no relevant entrypoint is found, fall back to "main".
  if (!foundEntrypoint) {
    foundEntrypoint = depManifest.main;
  }
  // Sometimes packages don't give an entrypoint, assuming you'll fall back to "index.js".
  const isImplicitEntrypoint = !foundEntrypoint;
  if (isImplicitEntrypoint) {
    foundEntrypoint = 'index.js';
  }
  if (typeof foundEntrypoint !== 'string') {
    throw new Error(`"${dep}" has unexpected entrypoint: ${JSON.stringify(foundEntrypoint)}.`);
  }
  try {
    return {
      type: 'JS',
      loc: require.resolve(path.join(depManifestLoc || '', '..', foundEntrypoint)),
    };
  } catch (err) {
    // Type only packages! Some packages are purely for TypeScript (ex: csstypes).
    // If no JS entrypoint was given or found, but a TS "types"/"typings" entrypoint
    // was given, assume a TS-types only package and ignore.
    if (isImplicitEntrypoint && (depManifest.types || depManifest.typings)) {
      return {type: 'IGNORE', loc: ''};
    }
    // Otherwise, file truly doesn't exist.
    throw err;
  }
}

interface InstallOptions {
  lockfile: ImportMap | null;
  logError: (msg: string) => void;
  logUpdate: (msg: string) => void;
}

type InstallResult = {success: false; importMap: null} | {success: true; importMap: ImportMap};

const FAILED_INSTALL_RETURN: InstallResult = {
  success: false,
  importMap: null,
};
export async function install(
  installTargets: InstallTarget[],
  {lockfile, logError, logUpdate}: InstallOptions,
  config: SnowpackConfig,
): Promise<InstallResult> {
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
      treeshake: isTreeshake,
    },
  } = config;

  const nodeModulesInstalled = findUp.sync('node_modules', {cwd, type: 'directory'});
  if (!webDependencies && !(process.versions as any).pnp && !nodeModulesInstalled) {
    logError('no "node_modules" directory exists. Did you run "npm install" first?');
    return FAILED_INSTALL_RETURN;
  }
  const allInstallSpecifiers = new Set(
    installTargets
      .filter(
        (dep) =>
          !externalPackages.some((packageName) => isImportOfPackage(dep.specifier, packageName)),
      )
      .map((dep) => dep.specifier)
      .map((specifier) => installAlias[specifier] || specifier)
      .sort(),
  );
  const installEntrypoints: {[targetName: string]: string} = {};
  const assetEntrypoints: {[targetName: string]: string} = {};
  const importMap: ImportMap = {imports: {}};
  const installTargetsMap: {[targetLoc: string]: InstallTarget[]} = {};
  const skipFailures = false;
  const autoDetectNamedExports = [
    ...CJS_PACKAGES_TO_AUTO_DETECT,
    ...config.installOptions.namedExports,
  ];

  for (const installSpecifier of allInstallSpecifiers) {
    const targetName = getWebDependencyName(installSpecifier);
    const proxiedName = sanitizePackageName(targetName); // sometimes we need to sanitize webModule names, as in the case of tippy.js -> tippyjs
    if (lockfile && lockfile.imports[installSpecifier]) {
      installEntrypoints[targetName] = lockfile.imports[installSpecifier];
      importMap.imports[installSpecifier] = `./${proxiedName}.js`;
      installResults.push([targetName, 'SUCCESS']);
      logUpdate(formatInstallResults());
      continue;
    }
    try {
      const {type: targetType, loc: targetLoc} = resolveWebDependency(installSpecifier);
      if (targetType === 'JS') {
        installEntrypoints[targetName] = targetLoc;
        importMap.imports[installSpecifier] = `./${proxiedName}.js`;
        Object.entries(installAlias)
          .filter(([, value]) => value === installSpecifier)
          .forEach(([key]) => {
            importMap.imports[key] = `./${targetName}.js`;
          });
        installTargetsMap[targetLoc] = installTargets.filter(
          (t) => installSpecifier === t.specifier,
        );
        installResults.push([installSpecifier, 'SUCCESS']);
      } else if (targetType === 'ASSET') {
        assetEntrypoints[targetName] = targetLoc;
        importMap.imports[installSpecifier] = `./${proxiedName}`;
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
      return FAILED_INSTALL_RETURN;
    }
  }
  if (Object.keys(installEntrypoints).length === 0 && Object.keys(assetEntrypoints).length === 0) {
    logError(`No ESM dependencies found!`);
    console.log(
      colors.dim(
        `  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at ${colors.underline(
          'https://www.pika.dev',
        )}`,
      ),
    );
    return FAILED_INSTALL_RETURN;
  }

  await initESModuleLexer;
  let isCircularImportFound = false;
  const inputOptions: InputOptions = {
    input: installEntrypoints,
    external: (id) => externalPackages.some((packageName) => isImportOfPackage(id, packageName)),
    treeshake: {moduleSideEffects: 'no-external'},
    plugins: [
      rollupPluginReplace(getRollupReplaceKeys(env)),
      !!webDependencies &&
        rollupPluginDependencyCache({
          installTypes,
          log: (url) => logUpdate(colors.dim(url)),
        }),
      rollupPluginAlias({
        entries: Object.entries(installAlias).map(([alias, mod]) => ({
          find: alias,
          replacement: mod,
        })),
      }),
      rollupPluginCatchFetch(),
      rollupPluginNodeResolve({
        mainFields: ['browser:module', 'module', 'browser', 'main'].filter(isTruthy),
        extensions: ['.mjs', '.cjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: true, // Default: true
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
        extensions: ['.js', '.cjs'],
        // Workaround: CJS -> ESM isn't supported yet by the plugin, so we needed
        // to add our own custom workaround here. Requires a fork of
        // rollupPluginCommonjs that supports the "externalEsm" option.
        externalEsm: process.env.EXTERNAL_ESM_PACKAGES || [],
      } as RollupCommonJSOptions),
      rollupPluginWrapInstallTargets(!!isTreeshake, autoDetectNamedExports, installTargets),
      rollupPluginDependencyStats((info) => (dependencyStats = info)),
      ...userDefinedRollup.plugins, // load user-defined plugins last
      rollupPluginCatchUnresolved(),
      ...(config.buildOptions.minify ? [esbuild({minify: true})] : []),
    ].filter(Boolean) as Plugin[],
    onwarn(warning, warn) {
      // Warn about the first circular dependency, but then ignore the rest.
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        if (!isCircularImportFound) {
          isCircularImportFound = true;
          logUpdate(`Warning: 1+ circular dependencies found via "${warning.importer}".`);
        }
        return;
      }
      // Log "unresolved" import warnings as an error, causing Snowpack to fail at the end.
      if (
        warning.code === 'PLUGIN_WARNING' &&
        warning.plugin === 'snowpack:rollup-plugin-catch-unresolved'
      ) {
        // Display posix-style on all environments, mainly to help with CI :)
        if (warning.id) {
          const fileName = path.relative(cwd, warning.id).replace(/\\/g, '/');
          logError(`${fileName}\n   ${warning.message}`);
        } else {
          logError(`${warning.message}. See https://www.snowpack.dev/#troubleshooting`);
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
      const fileName = path.relative(cwd, errFilePath).replace(/\\/g, '/');
      logError(
        `${colors.bold('snowpack')} failed to load ${colors.bold(fileName)}\n  ${suggestion}`,
      );
      return FAILED_INSTALL_RETURN;
    }
  }

  await writeLockfile(path.join(destLoc, 'import-map.json'), importMap);
  for (const [assetName, assetLoc] of Object.entries(assetEntrypoints)) {
    const assetDest = `${destLoc}/${sanitizePackageName(assetName)}`;
    mkdirp.sync(path.dirname(assetDest));
    fs.copyFileSync(assetLoc, assetDest);
  }

  return {success: true, importMap};
}

export async function getInstallTargets(
  config: SnowpackConfig,
  scannedFiles?: SnowpackSourceFile[],
) {
  const {knownEntrypoints, webDependencies} = config;
  const installTargets: InstallTarget[] = [];
  if (knownEntrypoints) {
    installTargets.push(...scanDepList(knownEntrypoints, cwd));
  }
  if (webDependencies) {
    installTargets.push(...scanDepList(Object.keys(webDependencies), cwd));
  }
  if (scannedFiles) {
    installTargets.push(...(await scanImportsFromFiles(scannedFiles, config)));
  } else {
    installTargets.push(...(await scanImports(cwd, config)));
  }
  return installTargets;
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  const installTargets = await getInstallTargets(config);
  if (installTargets.length === 0) {
    defaultLogError('Nothing to install.');
    return;
  }
  const finalResult = await run({...commandOptions, installTargets});
  if (finalResult.newLockfile) {
    await writeLockfile(path.join(cwd, 'snowpack.lock.json'), finalResult.newLockfile);
  }
  if (finalResult.stats) {
    console.log(printStats(finalResult.stats));
  }
  if (!finalResult.success || finalResult.hasError) {
    process.exit(1);
  }
}

interface InstalllRunOptions extends CommandOptions {
  installTargets: InstallTarget[];
}

interface InstallRunResult {
  success: boolean;
  hasError: boolean;
  importMap: ImportMap | null;
  newLockfile: ImportMap | null;
  stats: DependencyStatsOutput | null;
}

export async function run({
  config,
  lockfile,
  installTargets,
}: InstalllRunOptions): Promise<InstallRunResult> {
  const {
    installOptions: {dest},
    webDependencies,
  } = config;

  installResults = [];
  dependencyStats = null;
  spinner = ora(banner);
  spinnerHasError = false;

  if (installTargets.length === 0) {
    return {
      success: true,
      hasError: false,
      importMap: {imports: {}} as ImportMap,
      newLockfile: null,
      stats: null,
    };
  }

  let newLockfile: ImportMap | null = null;
  if (webDependencies && Object.keys(webDependencies).length > 0) {
    newLockfile = await resolveTargetsFromRemoteCDN(lockfile, config).catch((err) => {
      defaultLogError(err.message || err);
      process.exit(1);
    });
  }

  rimraf.sync(dest);
  const startTime = Date.now();
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
      console.log('\n' + colors.red(colors.bold(`✘ ${err.loc.file}`)));
    }
    if (err.url) {
      console.log(colors.dim(`👉 ${err.url}`));
    }
    spinner.stop();
    throw err;
  });

  if (finalResult.success) {
    spinner.succeed(
      colors.bold(`snowpack`) +
        ` install complete${spinnerHasError ? ' with errors.' : '.'}` +
        colors.dim(` [${((Date.now() - startTime) / 1000).toFixed(2)}s]`),
    );
  } else {
    spinner.stop();
  }

  return {
    success: finalResult.success,
    hasError: spinnerHasError,
    importMap: finalResult.importMap,
    newLockfile,
    stats: dependencyStats!,
  };
}
