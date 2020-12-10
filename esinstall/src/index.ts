import rollupPluginAlias from '@rollup/plugin-alias';
import rollupPluginCommonjs, {RollupCommonJSOptions} from '@rollup/plugin-commonjs';
import rollupPluginJson from '@rollup/plugin-json';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import {init as initESModuleLexer} from 'es-module-lexer';
import fs from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';
import {InputOptions, OutputOptions, Plugin as RollupPlugin, rollup, RollupError} from 'rollup';
import rollupPluginNodePolyfills from 'rollup-plugin-node-polyfills';
import rollupPluginReplace from '@rollup/plugin-replace';
import util from 'util';
import validatePackageName from 'validate-npm-package-name';
import {rollupPluginCatchFetch} from './rollup-plugins/rollup-plugin-catch-fetch';
import {rollupPluginCatchUnresolved} from './rollup-plugins/rollup-plugin-catch-unresolved';
import {rollupPluginCss} from './rollup-plugins/rollup-plugin-css';
import {rollupPluginNodeProcessPolyfill} from './rollup-plugins/rollup-plugin-node-process-polyfill';
import {rollupPluginDependencyStats} from './rollup-plugins/rollup-plugin-stats';
import {rollupPluginStripSourceMapping} from './rollup-plugins/rollup-plugin-strip-source-mapping';
import {rollupPluginWrapInstallTargets} from './rollup-plugins/rollup-plugin-wrap-install-targets';
import {
  AbstractLogger,
  DependencyStatsOutput,
  EnvVarReplacements,
  ImportMap,
  InstallTarget,
} from './types';
import {
  createInstallTarget,
  findMatchingAliasEntry,
  getWebDependencyName,
  isJavaScript,
  isPackageAliasEntry,
  MISSING_PLUGIN_SUGGESTIONS,
  parsePackageImportSpecifier,
  resolveDependencyManifest,
  sanitizePackageName,
  writeLockfile,
} from './util';

export * from './types';
export {printStats} from './stats';

type DependencyLoc =
  | {
      type: 'JS';
      loc: string;
    }
  | {
      type: 'ASSET';
      loc: string;
    }
  | {
      type: 'DTS';
      loc: undefined;
    };

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
  'chai/index.js',
];

// Rarely, a package will ship a broken "browser" package.json entrypoint.
// Ignore the "browser" entrypoint in those packages.
const BROKEN_BROWSER_ENTRYPOINT = ['@sheerun/mutationobserver-shim'];

function isImportOfPackage(importUrl: string, packageName: string) {
  return packageName === importUrl || importUrl.startsWith(packageName + '/');
}

function resolveExportsMap(packageManifest: {exports: {}}, exportsProp: string) {
  const exportMapEntry = packageManifest.exports[exportsProp];
  const exportMapValue =
    exportMapEntry?.browser ||
    exportMapEntry?.import ||
    exportMapEntry?.default ||
    exportMapEntry?.require ||
    exportMapEntry;

  return exportMapValue;
}

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
function resolveWebDependency(
  dep: string,
  {cwd, packageLookupFields}: {cwd: string; packageLookupFields: string[]},
): DependencyLoc {
  // We first need to check for an export map in the package.json. If one exists, resolve to it.
  const [packageName, packageEntrypoint] = parsePackageImportSpecifier(dep);
  const [packageManifestLoc, packageManifest] = resolveDependencyManifest(packageName, cwd);

  if (packageManifestLoc && packageManifest && packageManifest.exports) {
    // If this is a non-main entry point
    if (packageEntrypoint) {
      const exportMapValue = resolveExportsMap(packageManifest, './' + packageEntrypoint);

      if (typeof exportMapValue !== 'string') {
        throw new Error(
          `Package "${packageName}" exists but package.json "exports" does not include entry for "./${packageEntrypoint}".`,
        );
      }
      const loc = path.join(packageManifestLoc, '..', exportMapValue);
      return {
        type: isJavaScript(loc) ? 'JS' : 'ASSET',
        loc,
      };
    } else {
      const exportMapValue = resolveExportsMap(packageManifest, '.');

      if (exportMapValue) {
        const loc = path.join(packageManifestLoc, '..', exportMapValue);
        return {
          type: isJavaScript(loc) ? 'JS' : 'ASSET',
          loc,
        };
      }
    }
  }

  // if, no export map and dep points directly to a file within a package, return that reference.
  if (path.extname(dep) && !validatePackageName(dep).validForNewPackages) {
    // For details on why we need to call fs.realpathSync.native here and other places, see
    // https://github.com/snowpackjs/snowpack/pull/999.
    const loc = fs.realpathSync.native(require.resolve(dep, {paths: [cwd]}));
    return {
      type: isJavaScript(loc) ? 'JS' : 'ASSET',
      loc,
    };
  }

  // Otherwise, resolve directly to the dep specifier. Note that this supports both
  // "package-name" & "package-name/some/path" where "package-name/some/path/package.json"
  // exists at that lower path, that must be used to resolve. In that case, export
  // maps should not be supported.
  const [depManifestLoc, depManifest] = resolveDependencyManifest(dep, cwd);
  if (!depManifest) {
    try {
      const maybeLoc = fs.realpathSync.native(require.resolve(dep, {paths: [cwd]}));
      return {
        type: isJavaScript(maybeLoc) ? 'JS' : 'ASSET',
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
    throw new Error(
      `React workaround packages no longer needed! Revert back to the official React & React-DOM packages.`,
    );
  }
  let foundEntrypoint: any = [
    ...packageLookupFields,
    'browser:module',
    'module',
    'main:esnext',
    'jsnext:main',
  ]
    .map((e) => depManifest[e])
    .find(Boolean);
  if (!foundEntrypoint && !BROKEN_BROWSER_ENTRYPOINT.includes(packageName)) {
    foundEntrypoint = depManifest.browser;
  }

  // Some packages define "browser" as an object. We'll do our best to find the
  // right entrypoint in an entrypoint object, or fail otherwise.
  // See: https://github.com/defunctzombie/package-browser-field-spec
  if (typeof foundEntrypoint === 'object') {
    foundEntrypoint =
      foundEntrypoint[dep] ||
      foundEntrypoint['./index.js'] ||
      foundEntrypoint['./index'] ||
      foundEntrypoint['index.js'] ||
      foundEntrypoint['index'] ||
      foundEntrypoint['./'] ||
      foundEntrypoint['.'];
  }
  // If browser object is set but no relevant entrypoint is found, fall back to "main".
  if (!foundEntrypoint) {
    foundEntrypoint = depManifest.main;
  }
  // Sometimes packages don't give an entrypoint, assuming you'll fall back to "index.js".
  if (!foundEntrypoint && fs.existsSync(path.join(depManifestLoc, '../index.js'))) {
    foundEntrypoint = 'index.js';
  }
  // Some packages are types-only. If this is one of those packages, resolve with that.
  if (!foundEntrypoint && (depManifest.types || depManifest.typings)) {
    return {type: 'DTS', loc: undefined};
  }
  if (typeof foundEntrypoint !== 'string') {
    throw new Error(`"${dep}" has unexpected entrypoint: ${JSON.stringify(foundEntrypoint)}.`);
  }
  const loc = fs.realpathSync.native(
    require.resolve(path.join(depManifestLoc || '', '..', foundEntrypoint)),
  );
  return {
    type: isJavaScript(loc) ? 'JS' : 'ASSET',
    loc,
  };
}

function generateEnvObject(userEnv: EnvVarReplacements): Object {
  return {
    NODE_ENV: process.env.NODE_ENV || 'production',
    ...Object.keys(userEnv).reduce((acc, key) => {
      const value = userEnv[key];
      acc[key] = value === true ? process.env[key] : value;
      return acc;
    }, {}),
  };
}

function generateEnvReplacements(env: Object): {[key: string]: string} {
  return Object.keys(env).reduce((acc, key) => {
    acc[`process.env.${key}`] = JSON.stringify(env[key]);
    return acc;
  }, {});
}

interface InstallOptions {
  cwd: string;
  alias: Record<string, string>;
  lockfile?: ImportMap;
  logger: AbstractLogger;
  verbose?: boolean;
  dest: string;
  env: EnvVarReplacements;
  treeshake?: boolean;
  polyfillNode: boolean;
  sourceMap?: boolean | 'inline';
  externalPackage: string[];
  externalPackageEsm: string[];
  packageLookupFields: string[];
  namedExports: string[];
  rollup: {
    context?: string;
    plugins?: RollupPlugin[]; // for simplicity, only Rollup plugins are supported for now
    dedupe?: string[];
  };
}

type PublicInstallOptions = Partial<InstallOptions>;
export {PublicInstallOptions as InstallOptions};

export type InstallResult = {importMap: ImportMap; stats: DependencyStatsOutput};

const FAILED_INSTALL_MESSAGE = 'Install failed.';

function setOptionDefaults(_options: PublicInstallOptions): InstallOptions {
  const options = {
    cwd: process.cwd(),
    alias: {},
    logger: console,
    dest: 'web_modules',
    externalPackage: [],
    externalPackageEsm: [],
    polyfillNode: false,
    packageLookupFields: [],
    env: {},
    namedExports: [],
    rollup: {
      plugins: [],
      dedupe: [],
    },
    ..._options,
  };
  options.dest = path.resolve(options.cwd, options.dest);
  return options;
}

export async function install(
  _installTargets: (InstallTarget | string)[],
  _options: PublicInstallOptions = {},
): Promise<InstallResult> {
  const {
    cwd,
    alias: installAlias,
    lockfile,
    logger,
    dest: destLoc,
    namedExports,
    externalPackage,
    externalPackageEsm,
    sourceMap,
    env: userEnv,
    rollup: userDefinedRollup,
    treeshake: isTreeshake,
    polyfillNode,
    packageLookupFields,
  } = setOptionDefaults(_options);
  const env = generateEnvObject(userEnv);

  const installTargets: InstallTarget[] = _installTargets.map((t) =>
    typeof t === 'string' ? createInstallTarget(t) : t,
  );
  const allInstallSpecifiers = new Set(
    installTargets
      .filter(
        (dep) =>
          !externalPackage.some((packageName) => isImportOfPackage(dep.specifier, packageName)),
      )
      .map((dep) => dep.specifier)
      .map((specifier) => {
        const aliasEntry = findMatchingAliasEntry(installAlias, specifier);
        return aliasEntry && aliasEntry.type === 'package' ? aliasEntry.to : specifier;
      })
      .map((specifier) => specifier.replace(/(\/|\\)+$/, '')) // remove trailing slash from end of specifier (easier for Node to resolve)
      .sort((a, b) => a.localeCompare(b, undefined, {numeric: true})),
  );
  const installEntrypoints: {[targetName: string]: string} = {};
  const assetEntrypoints: {[targetName: string]: string} = {};
  const importMap: ImportMap = {imports: {}};
  let dependencyStats: DependencyStatsOutput | null = null;
  const skipFailures = false;
  const autoDetectNamedExports = [...CJS_PACKAGES_TO_AUTO_DETECT, ...namedExports];

  for (const installSpecifier of allInstallSpecifiers) {
    let targetName = getWebDependencyName(installSpecifier);
    let proxiedName = sanitizePackageName(targetName); // sometimes we need to sanitize webModule names, as in the case of tippy.js -> tippyjs
    if (lockfile && lockfile.imports[installSpecifier]) {
      installEntrypoints[targetName] = lockfile.imports[installSpecifier];
      importMap.imports[installSpecifier] = `./${proxiedName}.js`;
      continue;
    }
    try {
      const resolvedResult = resolveWebDependency(installSpecifier, {
        cwd,
        packageLookupFields,
      });
      if (resolvedResult.type === 'JS') {
        installEntrypoints[targetName] = resolvedResult.loc;
        importMap.imports[installSpecifier] = `./${proxiedName}.js`;
        Object.entries(installAlias)
          .filter(([, value]) => value === installSpecifier)
          .forEach(([key]) => {
            importMap.imports[key] = `./${targetName}.js`;
          });
      } else if (resolvedResult.type === 'ASSET') {
        // add extension if missing
        const isMissingExt = path.extname(resolvedResult.loc) && !path.extname(proxiedName);
        if (isMissingExt) {
          const ext = path.basename(resolvedResult.loc).replace(/[^.]+/, '');
          targetName += ext;
          proxiedName += ext;
        }
        assetEntrypoints[targetName] = resolvedResult.loc;
        importMap.imports[installSpecifier] = `./${proxiedName}`;
      } else if (resolvedResult.type === 'DTS') {
        // This is fine! Skip type-only packages
        logger.debug(`[${installSpecifier}] target points to a TS-only package.`);
      }
    } catch (err) {
      if (skipFailures) {
        continue;
      }
      throw err;
    }
  }
  if (Object.keys(installEntrypoints).length === 0 && Object.keys(assetEntrypoints).length === 0) {
    throw new Error(`No ESM dependencies found!
${colors.dim(
  `  At least one dependency must have an ESM "module" entrypoint. You can find modern, web-ready packages at ${colors.underline(
    'https://www.pika.dev',
  )}`,
)}`);
  }

  await initESModuleLexer;
  let isFatalWarningFound = false;
  const inputOptions: InputOptions = {
    input: installEntrypoints,
    context: userDefinedRollup.context,
    external: (id) => externalPackage.some((packageName) => isImportOfPackage(id, packageName)),
    treeshake: {moduleSideEffects: 'no-external'},
    plugins: [
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
        mainFields: ['browser:module', 'module', 'browser', 'main'],
        extensions: ['.mjs', '.cjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: true, // Default: true
        dedupe: userDefinedRollup.dedupe || [],
      }),
      rollupPluginJson({
        preferConst: true,
        indent: '  ',
        compact: false,
        namedExports: true,
      }),
      rollupPluginCss(),
      rollupPluginReplace(generateEnvReplacements(env)),
      rollupPluginCommonjs({
        extensions: ['.js', '.cjs'],
        esmExternals: externalPackageEsm,
        requireReturnsDefault: 'auto',
      } as RollupCommonJSOptions),
      rollupPluginWrapInstallTargets(!!isTreeshake, autoDetectNamedExports, installTargets, logger),
      rollupPluginDependencyStats((info) => (dependencyStats = info)),
      rollupPluginNodeProcessPolyfill(env),
      polyfillNode && rollupPluginNodePolyfills(),
      ...(userDefinedRollup.plugins || []), // load user-defined plugins last
      rollupPluginCatchUnresolved(),
      rollupPluginStripSourceMapping(),
    ].filter(Boolean) as Plugin[],
    onwarn(warning) {
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
      const {loc, message} = warning;
      const logMessage = loc ? `${loc.file}:${loc.line}:${loc.column} ${message}` : message;
      // These warnings are usually harmless in packages, so don't show them by default.
      if (
        warning.code === 'CIRCULAR_DEPENDENCY' ||
        warning.code === 'NAMESPACE_CONFLICT' ||
        warning.code === 'THIS_IS_UNDEFINED'
      ) {
        logger.debug(logMessage);
      } else {
        logger.warn(logMessage);
      }
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

  rimraf.sync(destLoc);
  if (Object.keys(installEntrypoints).length > 0) {
    try {
      logger.debug(`running installer with options: ${util.format(inputOptions)}`);
      const packageBundle = await rollup(inputOptions);
      logger.debug(
        `installing npm packages:\n    ${Object.keys(installEntrypoints).join('\n    ')}`,
      );
      if (isFatalWarningFound) {
        throw new Error(FAILED_INSTALL_MESSAGE);
      }
      logger.debug(`writing install results to disk`);
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
    importMap,
    stats: dependencyStats!,
  };
}
