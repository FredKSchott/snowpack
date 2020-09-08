import rollupPluginAlias from '@rollup/plugin-alias';
import rollupPluginCommonjs, {RollupCommonJSOptions} from '@rollup/plugin-commonjs';
import rollupPluginJson from '@rollup/plugin-json';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginNodePolyfills from 'rollup-plugin-node-polyfills';
import {init as initESModuleLexer} from 'es-module-lexer';
import findUp from 'find-up';
import fs from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import {performance} from 'perf_hooks';
import rimraf from 'rimraf';
import {InputOptions, OutputOptions, rollup, RollupError} from 'rollup';
import validatePackageName from 'validate-npm-package-name';
import {logger} from '../logger';
import {resolveTargetsFromRemoteCDN} from '../resolve-remote.js';
import {rollupPluginCatchUnresolved} from '../rollup-plugins/rollup-plugin-catch-unresolved.js';
import {rollupPluginCatchFetch} from '../rollup-plugins/rollup-plugin-catch-fetch';
import {rollupPluginCss} from '../rollup-plugins/rollup-plugin-css';
import {rollupPluginDependencyCache} from '../rollup-plugins/rollup-plugin-remote-cdn.js';
import {rollupPluginDependencyStats} from '../rollup-plugins/rollup-plugin-stats.js';
import {rollupPluginWrapInstallTargets} from '../rollup-plugins/rollup-plugin-wrap-install-targets';
import {rollupPluginNodeProcessPolyfill} from '../rollup-plugins/rollup-plugin-node-process-polyfill';
import {rollupPluginStripSourceMapping} from '../rollup-plugins/rollup-plugin-strip-source-mapping';
import {scanDepList, scanImports, scanImportsFromFiles} from '../scan-imports.js';
import {printStats} from '../stats-formatter.js';
import {
  CommandOptions,
  DependencyStatsOutput,
  ImportMap,
  InstallTarget,
  SnowpackConfig,
  SnowpackSourceFile,
} from '../types/snowpack';
import {
  isTruthy,
  MISSING_PLUGIN_SUGGESTIONS,
  parsePackageImportSpecifier,
  resolveDependencyManifest,
  sanitizePackageName,
  writeLockfile,
  isPackageAliasEntry,
  findMatchingAliasEntry,
  getWebDependencyName,
} from '../util.js';

type InstallResultCode = 'SUCCESS' | 'ASSET' | 'FAIL';

interface DependencyLoc {
  type: 'JS' | 'ASSET' | 'IGNORE';
  loc: string;
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

let installResults: [string, InstallResultCode][] = [];
let dependencyStats: DependencyStatsOutput | null = null;

function isImportOfPackage(importUrl: string, packageName: string) {
  return packageName === importUrl || importUrl.startsWith(packageName + '/');
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
        logger.error(
          `Package "${packageName}" exists but package.json "exports" does not include entry for "./${packageEntrypoint}".`,
        );
        process.exit(1);
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
    throw new Error(
      `Package "${dep}" not found. Have you installed it? ${depManifestLoc ? depManifestLoc : ''}`,
    );
  }
  if (
    depManifest.name &&
    (depManifest.name.startsWith('@reactesm') || depManifest.name.startsWith('@pika/react'))
  ) {
    logger.error(
      `React workaround packages no longer needed! Revert back to the official React & React-DOM packages.`,
    );
    process.exit(1);
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
  config: SnowpackConfig;
}

type InstallResult = {success: false; importMap: null} | {success: true; importMap: ImportMap};

const FAILED_INSTALL_MESSAGE = 'Install failed.';
const EMPTY_INSTALL_RETURN: InstallResult = {
  success: false,
  importMap: null,
};

export async function install(
  installTargets: InstallTarget[],
  {lockfile, config}: InstallOptions,
): Promise<InstallResult> {
  const {
    webDependencies,
    alias: installAlias,
    installOptions: {
      installTypes,
      dest: destLoc,
      externalPackage: externalPackages,
      sourceMap,
      env,
      rollup: userDefinedRollup,
      treeshake: isTreeshake,
      polyfillNode,
    },
  } = config;

  const nodeModulesInstalled = findUp.sync('node_modules', {cwd, type: 'directory'});
  if (!webDependencies && !(process.versions as any).pnp && !nodeModulesInstalled) {
    logger.error('No "node_modules" directory exists. Did you run "npm install" first?');
    return EMPTY_INSTALL_RETURN;
  }
  const allInstallSpecifiers = new Set(
    installTargets
      .filter(
        (dep) =>
          !externalPackages.some((packageName) => isImportOfPackage(dep.specifier, packageName)),
      )
      .map((dep) => dep.specifier)
      .map((specifier) => {
        const aliasEntry = findMatchingAliasEntry(config, specifier);
        return aliasEntry && aliasEntry.type === 'package' ? aliasEntry.to : specifier;
      })
      .sort(),
  );
  const installEntrypoints: {[targetName: string]: string} = {};
  const assetEntrypoints: {[targetName: string]: string} = {};
  const importMap: ImportMap = {imports: {}};
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
        installResults.push([installSpecifier, 'SUCCESS']);
      } else if (targetType === 'ASSET') {
        assetEntrypoints[targetName] = targetLoc;
        importMap.imports[installSpecifier] = `./${proxiedName}`;
        installResults.push([installSpecifier, 'ASSET']);
      }
    } catch (err) {
      installResults.push([installSpecifier, 'FAIL']);
      if (skipFailures) {
        continue;
      }
      logger.error(err.message || err);
      throw new Error(FAILED_INSTALL_MESSAGE);
    }
  }
  if (Object.keys(installEntrypoints).length === 0 && Object.keys(assetEntrypoints).length === 0) {
    logger.error(`No ESM dependencies found!
${colors.dim(
  `  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at ${colors.underline(
    'https://www.pika.dev',
  )}`,
)}`);
    return EMPTY_INSTALL_RETURN;
  }

  await initESModuleLexer;
  let isCircularImportFound = false;
  let isFatalWarningFound = false;
  const inputOptions: InputOptions = {
    input: installEntrypoints,
    external: (id) => externalPackages.some((packageName) => isImportOfPackage(id, packageName)),
    treeshake: {moduleSideEffects: 'no-external'},
    plugins: [
      !!webDependencies &&
        rollupPluginDependencyCache({
          installTypes,
          log: (url) => {
            logger.debug(`installing ${colors.dim(url)}…`);
          },
        }),
      rollupPluginAlias({
        entries: Object.entries(installAlias)
          .filter(([, val]) => isPackageAliasEntry(val))
          .map(([key, val]) => ({
            find: key,
            replacement: val,
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
        externalEsm: process.env.EXTERNAL_ESM_PACKAGES || [],
        requireReturnsDefault: 'auto',
      } as RollupCommonJSOptions),
      rollupPluginWrapInstallTargets(!!isTreeshake, autoDetectNamedExports, installTargets),
      rollupPluginDependencyStats((info) => (dependencyStats = info)),
      rollupPluginNodeProcessPolyfill({
        NODE_ENV: process.env.NODE_ENV || 'production',
        ...env,
      }),
      polyfillNode && rollupPluginNodePolyfills(),
      ...userDefinedRollup.plugins, // load user-defined plugins last
      rollupPluginCatchUnresolved(),
      rollupPluginStripSourceMapping(),
    ].filter(Boolean) as Plugin[],
    onwarn(warning, warn) {
      // Warn about the first circular dependency, but then ignore the rest.
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        if (!isCircularImportFound) {
          isCircularImportFound = true;
          logger.warn(`Warning: 1+ circular dependencies found via "${warning.importer}".`);
        }
        return;
      }
      // Log "unresolved" import warnings as an error, causing Snowpack to fail at the end.
      if (
        warning.code === 'PLUGIN_WARNING' &&
        warning.plugin === 'snowpack:rollup-plugin-catch-unresolved'
      ) {
        isFatalWarningFound = true;
        // Display posix-style on all environments, mainly to help with CI :)
        if (warning.id) {
          const fileName = path.relative(cwd, warning.id).replace(/\\/g, '/');
          logger.error(`${fileName}\n   ${warning.message}`);
        } else {
          logger.error(`${warning.message}. See https://www.snowpack.dev/#troubleshooting`);
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
    entryFileNames: (chunk) => {
      const targetName = getWebDependencyName(chunk.name);
      const proxiedName = sanitizePackageName(targetName);
      return `${proxiedName}.js`;
    },
    chunkFileNames: 'common/[name]-[hash].js',
  };
  if (Object.keys(installEntrypoints).length > 0) {
    try {
      const packageBundle = await rollup(inputOptions);
      logger.debug(
        `installing npm packages:\n    ${Object.keys(installEntrypoints).join('\n    ')}`,
      );
      if (isFatalWarningFound) {
        throw new Error(FAILED_INSTALL_MESSAGE);
      }
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
      logger.error(`Failed to load ${colors.bold(fileName)}\n  ${suggestion}`);
      throw new Error(FAILED_INSTALL_MESSAGE);
    }
  }

  mkdirp.sync(destLoc);
  await writeLockfile(path.join(destLoc, 'import-map.json'), importMap);
  for (const [assetName, assetLoc] of Object.entries(assetEntrypoints)) {
    const assetDest = `${destLoc}/${sanitizePackageName(assetName)}`;
    mkdirp.sync(path.dirname(assetDest));
    fs.copyFileSync(assetLoc, assetDest);
  }

  return {
    success: true,
    importMap,
  };
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
  // TODO: remove this if block; move logic inside scanImports
  if (scannedFiles) {
    installTargets.push(...(await scanImportsFromFiles(scannedFiles, config)));
  } else {
    installTargets.push(...(await scanImports(cwd, config)));
  }
  return installTargets;
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;

  logger.debug('Starting install');
  const installTargets = await getInstallTargets(config);
  logger.debug('Received install targets');
  if (installTargets.length === 0) {
    logger.error('Nothing to install.');
    return;
  }
  logger.debug('Running install command');
  const finalResult = await run({...commandOptions, installTargets});
  logger.debug('Install command successfully ran');
  if (finalResult.newLockfile) {
    await writeLockfile(path.join(cwd, 'snowpack.lock.json'), finalResult.newLockfile);
    logger.debug('Successfully wrote lockfile');
  }
  if (finalResult.stats) {
    logger.info(printStats(finalResult.stats));
  }

  if (!finalResult.success || finalResult.hasError) {
    process.exit(1);
  }
}

interface InstallRunOptions extends CommandOptions {
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
}: InstallRunOptions): Promise<InstallRunResult> {
  const {
    installOptions: {dest},
    webDependencies,
  } = config;

  // start
  const installStart = performance.now();
  logger.info(colors.yellow('! installing dependencies…'));

  installResults = [];
  dependencyStats = null;

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
      logger.error('\n' + err.message || err);
      process.exit(1);
    });
  }

  rimraf.sync(dest);
  const finalResult = await install(installTargets, {
    lockfile: newLockfile,
    config,
  }).catch((err) => {
    if (err.loc) {
      logger.error(colors.red(colors.bold(`✘ ${err.loc.file}`)));
    }
    if (err.url) {
      logger.error(colors.dim(`👉 ${err.url}`));
    }
    logger.error(err.message || err);
    process.exit(1);
  });

  // finish
  const installEnd = performance.now();
  const depList = (finalResult.importMap && Object.keys(finalResult.importMap.imports)) || [];
  logger.info(
    `${
      depList.length
        ? colors.green(`✔`) + ' install complete'
        : 'install skipped (nothing to install)'
    } ${colors.dim(`[${((installEnd - installStart) / 1000).toFixed(2)}s]`)}`,
  );

  return {
    success: true,
    hasError: false,
    importMap: finalResult.importMap,
    newLockfile,
    stats: dependencyStats!,
  };
}
