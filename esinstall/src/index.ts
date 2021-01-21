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
import rollupPluginNodePolyfills from 'rollup-plugin-polyfill-node';
import rollupPluginReplace from '@rollup/plugin-replace';
import util from 'util';
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
  getWebDependencyType,
  isJavaScript,
  MISSING_PLUGIN_SUGGESTIONS,
  sanitizePackageName,
  writeLockfile,
} from './util';
import {resolveEntrypoint, MAIN_FIELDS} from './entrypoints';

export * from './types';
export {
  findExportMapEntry,
  findManifestEntry,
  resolveEntrypoint,
  explodeExportMap,
} from './entrypoints';
export {printStats} from './stats';

type DependencyLoc = {
  type: 'BUNDLE' | 'ASSET' | 'DTS';
  loc: string;
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
  'events/events.js',
];

function isImportOfPackage(importUrl: string, packageName: string) {
  return packageName === importUrl || importUrl.startsWith(packageName + '/');
}

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
function resolveWebDependency(
  dep: string,
  resolveOptions: {cwd: string; packageLookupFields: string[]},
): DependencyLoc {
  const loc = resolveEntrypoint(dep, resolveOptions);

  return {
    loc,
    type: getWebDependencyType(loc),
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
  importMap?: ImportMap;
  logger: AbstractLogger;
  verbose?: boolean;
  dest: string;
  env: EnvVarReplacements;
  treeshake?: boolean;
  polyfillNode: boolean;
  sourcemap?: boolean | 'inline';
  external: string[];
  externalEsm: string[];
  packageLookupFields: string[];
  packageExportLookupFields: string[];
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
  if ((_options as any).lockfile) {
    throw new Error('[eslint@1.0.0] option `lockfile` was renamed to `importMap`.');
  }
  if ((_options as any).sourceMap) {
    throw new Error('[eslint@1.0.0] option `sourceMap` was renamed to `sourcemap`.');
  }
  if ((_options as any).externalPackage) {
    throw new Error('[eslint@1.0.0] option `externalPackage` was renamed to `external`.');
  }
  if ((_options as any).externalPackageEsm) {
    throw new Error('[eslint@1.0.0] option `externalPackageEsm` was renamed to `externalEsm`.');
  }
  const options = {
    cwd: process.cwd(),
    alias: {},
    logger: {
      debug: () => {}, // silence debug messages by default
      log: console.log,
      warn: console.warn,
      error: console.error,
    },
    dest: 'web_modules',
    external: [],
    externalEsm: [],
    polyfillNode: false,
    packageLookupFields: [],
    packageExportLookupFields: [],
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
    importMap: _importMap,
    logger,
    dest: destLoc,
    namedExports,
    external,
    externalEsm,
    sourcemap,
    env: userEnv,
    rollup: userDefinedRollup,
    treeshake: isTreeshake,
    polyfillNode,
    packageLookupFields,
    packageExportLookupFields,
  } = setOptionDefaults(_options);
  const env = generateEnvObject(userEnv);

  const installTargets: InstallTarget[] = _installTargets.map((t) =>
    typeof t === 'string' ? createInstallTarget(t) : t,
  );
  const allInstallSpecifiers = new Set(
    installTargets
      .filter(
        (dep) => !external.some((packageName) => isImportOfPackage(dep.specifier, packageName)),
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
    if (_importMap) {
      if (_importMap.imports[installSpecifier]) {
        installEntrypoints[targetName] = _importMap.imports[installSpecifier];
        if (!path.extname(installSpecifier) || isJavaScript(installSpecifier)) {
          importMap.imports[installSpecifier] = `./${proxiedName}.js`;
        } else {
          importMap.imports[installSpecifier] = `./${proxiedName}`;
        }
        continue;
      }
      const findFolderImportEntry = Object.entries(_importMap.imports).find(([entry]) => {
        return entry.endsWith('/') && installSpecifier.startsWith(entry);
      });
      if (findFolderImportEntry) {
        installEntrypoints[targetName] =
          findFolderImportEntry[1] + targetName.substr(findFolderImportEntry[0].length);
        if (!path.extname(installSpecifier) || isJavaScript(installSpecifier)) {
          importMap.imports[installSpecifier] = `./${proxiedName}.js`;
        } else {
          importMap.imports[installSpecifier] = `./${proxiedName}`;
        }
        continue;
      }
    }

    try {
      const resolvedResult = resolveWebDependency(installSpecifier, {
        cwd,
        packageLookupFields,
      });
      if (resolvedResult.type === 'BUNDLE') {
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
    'https://www.skypack.dev',
  )}`,
)}`);
  }

  await initESModuleLexer;
  let isFatalWarningFound = false;
  const inputOptions: InputOptions = {
    input: installEntrypoints,
    context: userDefinedRollup.context,
    external: (id) => external.some((packageName) => isImportOfPackage(id, packageName)),
    treeshake: {moduleSideEffects: 'no-external'},
    plugins: [
      rollupPluginAlias({
        entries: Object.entries(installAlias).map(([key, val]) => ({
          find: key,
          replacement: val,
        })),
      }),
      rollupPluginCatchFetch(),
      rollupPluginNodeResolve({
        mainFields: [...packageLookupFields, ...MAIN_FIELDS],
        extensions: ['.mjs', '.cjs', '.js', '.json'], // Default: [ '.mjs', '.js', '.json', '.node' ]
        // whether to prefer built-in modules (e.g. `fs`, `path`) or local ones with the same names
        preferBuiltins: true, // Default: true
        dedupe: userDefinedRollup.dedupe || [],
        // @ts-ignore: Added in v11+ of this plugin
        exportConditions: packageExportLookupFields,
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
        esmExternals: externalEsm,
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
          logger.error(
            `${warning.message}. See https://www.snowpack.dev/reference/common-error-details`,
          );
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
    sourcemap,
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
      logger.debug(process.cwd());
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
      logger.debug(`FAILURE: ${_err}`);
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
