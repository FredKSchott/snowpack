import * as esbuild from 'esbuild';
import fs from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';
import util from 'util';
import {
  AbstractLogger,
  DefineReplacements,
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
  sanitizePackageName,
  writeLockfile,
} from './util';
import {resolveEntrypoint} from './entrypoints';
import {createVirtualEntrypoints} from './esbuild-plugins/util';
import {esbuildPluginEntrypoints} from './esbuild-plugins/esbuild-plugin-entrypoints';
import {esbuildPluginPolyfill} from './esbuild-plugins/esbuild-plugin-polyfill';
import {esbuildPluginNodePolyfill} from './esbuild-plugins/esbuild-plugin-node-polyfill';

export * from './types';
export {
  findExportMapEntry,
  findManifestEntry,
  resolveEntrypoint,
  explodeExportMap,
} from './entrypoints';
// export {printStats} from './stats';

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
  define: DefineReplacements;
  treeshake?: boolean;
  polyfillNode: boolean;
  sourcemap?: boolean | 'inline';
  external: string[];
  externalEsm: string[];
  packageLookupFields: string[];
  packageExportLookupFields: string[];
  namedExports: string[];
  esbuild: {
    plugins?: esbuild.Plugin[];
  }
  rollup: {
    context?: string;
    plugins?: any[]; // for simplicity, only Rollup plugins are supported for now
    dedupe?: string[];
  };
}

type PublicInstallOptions = Partial<InstallOptions>;
export {PublicInstallOptions as InstallOptions};

export type InstallResult = {importMap: ImportMap; stats: DependencyStatsOutput};

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
    define: {},
    namedExports: [],
    esbuild: {
      plugins: [],
    },
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
    define: userDefine,
    esbuild: userDefinedEsbuild,
    treeshake: isTreeshake,
    polyfillNode,
    packageLookupFields,
    packageExportLookupFields,
  } = setOptionDefaults(_options);
  const env = generateEnvObject(userEnv);
  const define = {
    'global': "globalThis",
    ...generateEnvReplacements(env),
    ...userDefine
  };

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

    // TODO: Pass resolve as a function, down to the plugin
    // TODO: Add export map support to resolve function
    
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

  const inputOptions: esbuild.BuildOptions = {
    entryPoints: Object.keys(installEntrypoints).map((ent) =>  ent + '.js'),
    outdir: destLoc,
    // outbase: path.join(cwd, 'PKG'),
    // write: false,
    bundle: true,
    splitting: true,
    sourcemap: true,
    format: 'esm',
    platform: 'browser',
    metafile: path.join(destLoc, 'build-manifest.json'),
    treeShaking: 'ignore-annotations',
    define,
    inject: [
      // require.resolve('@esbuild-plugins/node-globals-polyfill/process'),
      require.resolve('@esbuild-plugins/node-globals-polyfill/Buffer'),
    ],
    plugins: [
      // esbuildPluginPolyfill(env, cwd),
      // polyfillNode && esbuildPluginNodePolyfill({}),
      esbuildPluginEntrypoints(
        installEntrypoints,
        await createVirtualEntrypoints(
          !!isTreeshake,
          autoDetectNamedExports,
          installTargets,
          installEntrypoints,
          logger,
        ),
        installAlias,
        cwd
      ),
      ...(userDefinedEsbuild.plugins || []),
    ].filter(Boolean) as esbuild.Plugin[],
    // publicPath: config.buildOptions.baseUrl,
    // minify: config.optimize!.minify,
    // target: config.optimize!.target,
    // external: Array.from(new Set(allFiles.map((f) => '*' + path.extname(f)))).filter(
    //   (ext) => ext !== '*.js' && ext !== '*.mjs' && ext !== '*.css' && ext !== '*',
    // ),
  };

  rimraf.sync(destLoc);
  if (Object.keys(installEntrypoints).length > 0) {
    try {
      logger.debug(process.cwd());
      logger.debug(`running installer with options: ${util.format(inputOptions)}`);
      const esbuildService = await esbuild.startService();
      const {warnings} = await esbuildService.build(inputOptions);
      esbuildService.stop();
      console.log(warnings);
      // const packageBundle = await rollup(inputOptions);
      // logger.debug(
      //   `installing npm packages:\n    ${Object.keys(installEntrypoints).join('\n    ')}`,
      // );
      // if (isFatalWarningFound) {
      //   throw new Error(FAILED_INSTALL_MESSAGE);
      // }
      // logger.debug(`writing install results to disk`);
      // await packageBundle.write(outputOptions);
    } catch (_err) {
      logger.debug(`FAILURE: ${_err}`);
      throw _err;
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
