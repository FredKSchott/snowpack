import crypto from 'crypto';
import {
  InstallOptions,
  InstallTarget,
  resolveEntrypoint,
  resolveDependencyManifest as _resolveDependencyManifest,
} from 'esinstall';
import projectCacheDir from 'find-cache-dir';
import findUp from 'find-up';
import {existsSync, promises as fs} from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import PQueue from 'p-queue';
import path from 'path';
import rimraf from 'rimraf';
import slash from 'slash';
import {getBuiltFileUrls} from '../build/file-urls';
import {logger} from '../logger';
import {scanCodeImportsExports, transformFileImports} from '../rewrite-imports';
import {getInstallTargets} from '../scan-imports';
import {
  CommandOptions,
  ImportMap,
  PackageSource,
  PackageSourceLocal,
  SnowpackConfig,
} from '../types';
import {
  createInstallTarget,
  findMatchingAliasEntry,
  GLOBAL_CACHE_DIR,
  isJavaScript,
  isPathImport,
  isRemoteUrl,
} from '../util';
import {installPackages} from './local-install';

const PROJECT_CACHE_DIR =
  projectCacheDir({name: 'snowpack'}) ||
  // If `projectCacheDir()` is null, no node_modules directory exists.
  // Use the current path (hashed) to create a cache entry in the global cache instead.
  // Because this is specifically for dependencies, this fallback should rarely be used.
  path.join(GLOBAL_CACHE_DIR, crypto.createHash('md5').update(process.cwd()).digest('hex'));

const NEVER_PEER_PACKAGES: string[] = [
  '@babel/runtime',
  '@babel/runtime-corejs3',
  'babel-runtime',
  'dom-helpers',
  'es-abstract',
  'node-fetch',
  'whatwg-fetch',
  'tslib',
  '@ant-design/icons-svg',
];

const memoizedResolve: Record<string, Record<string, string>> = {};

function isPackageCJS(manifest: any): boolean {
  return (
    // If a "module" entrypoint is defined, we'll use that.
    !manifest.module &&
    // If "type":"module", assume ESM.
    manifest.type !== 'module' &&
    // If export map exists, assume ESM exists somewhere within it.
    !manifest.exports &&
    // If "main" exists and ends in ".mjs", assume ESM.
    !manifest.main?.endsWith('.mjs')
  );
}

function getRootPackageDirectory(loc: string) {
  const parts = loc.split('node_modules');
  if (parts.length === 1) {
    return undefined;
  }
  const packageParts = parts.pop()!.split(path.sep).filter(Boolean);
  const packageRoot = path.join(parts.join('node_modules'), 'node_modules');
  if (packageParts[0].startsWith('@')) {
    return path.join(packageRoot, packageParts[0], packageParts[1]);
  } else {
    return path.join(packageRoot, packageParts[0]);
  }
}

// A bit of a hack: we keep this in local state and populate it
// during the "prepare" call. Useful so that we don't need to pass
// this implementation detail around outside of this interface.
// Can't add it to the exported interface due to TS.
let config: SnowpackConfig;

type PackageImportData = {
  entrypoint: string;
  loc: string;
  installDest: string;
  packageVersion: string;
  packageName: string;
};
const allPackageImports: Record<string, PackageImportData> = {};
const allSymlinkImports: Record<string, string> = {};
const allKnownSpecs = new Set<string>();
const inProgressBuilds = new PQueue({concurrency: 1});
let hasWorkspaceWarningFired = false;

export function getLinkedUrl(builtUrl: string) {
  return allSymlinkImports[builtUrl];
}

/**
 * Local Package Source: A generic interface through which Snowpack
 * interacts with esinstall and your locally installed dependencies.
 */
export default {
  async load(id: string, isSSR: boolean) {
    const packageImport = allPackageImports[id];
    if (!packageImport) {
      return;
    }
    const {loc, entrypoint, packageName, packageVersion} = packageImport;
    let {installDest} = packageImport;
    if (isSSR && existsSync(installDest + '-ssr')) {
      installDest += '-ssr';
    }

    // Wait for any in progress builds to complete, in case they've
    // cleared out the directory that you're trying to read out of.
    await inProgressBuilds.onIdle();
    let packageCode = await fs.readFile(loc, 'utf8');
    const imports: InstallTarget[] = [];
    const type = path.extname(loc);
    if (!(type === '.js' || type === '.html' || type === '.css')) {
      return {contents: packageCode, imports};
    }

    const packageImportMap = JSON.parse(
      await fs.readFile(path.join(installDest, 'import-map.json'), 'utf8'),
    );
    const resolveImport = async (spec): Promise<string> => {
      if (isRemoteUrl(spec)) {
        return spec;
      }
      if (spec.startsWith('/')) {
        return spec;
      }
      // These are a bit tricky: relative paths within packages always point to
      // relative files within the built package (ex: 'pkg/common/XXX-hash.js`).
      // We resolve these to a new kind of "internal" import URL that's different
      // from the normal, flattened URL for public imports.
      if (isPathImport(spec)) {
        const newLoc = path.resolve(path.dirname(loc), spec);
        const resolvedSpec = slash(path.relative(installDest, newLoc));
        const publicImportEntry = Object.entries(packageImportMap.imports).find(
          ([, v]) => v === './' + resolvedSpec,
        );
        // If this matches the destination of a public package import, resolve to it.
        if (publicImportEntry) {
          spec = publicImportEntry[0];
          return await this.resolvePackageImport(entrypoint, spec, config);
        }
        // Otherwise, create a relative import ID for the internal file.
        const relativeImportId = path.posix.join(`${packageName}.v${packageVersion}`, resolvedSpec);
        allPackageImports[relativeImportId] = {
          entrypoint: path.join(installDest, 'package.json'),
          loc: newLoc,
          installDest,
          packageVersion,
          packageName,
        };
        return path.posix.join(config.buildOptions.metaUrlPath, 'pkg', relativeImportId);
      }
      // Otherwise, resolve this specifier as an external package.
      return await this.resolvePackageImport(entrypoint, spec, config);
    };
    packageCode = await transformFileImports({type, contents: packageCode}, async (spec) => {
      let resolvedImportUrl = await resolveImport(spec);
      const importExtName = path.posix.extname(resolvedImportUrl);
      const isProxyImport = importExtName && importExtName !== '.js' && importExtName !== '.mjs';
      if (config.buildOptions.resolveProxyImports && isProxyImport) {
        resolvedImportUrl = resolvedImportUrl + '.proxy.js';
      }
      imports.push(
        createInstallTarget(
          path.resolve(
            path.posix.join(config.buildOptions.metaUrlPath, 'pkg', id),
            resolvedImportUrl,
          ),
        ),
      );
      return resolvedImportUrl;
    });
    return {contents: packageCode, imports};
  },

  modifyBuildInstallOptions({installOptions, config: _config}) {
    config = config || _config;
    if (config.packageOptions.source !== 'local') {
      return installOptions;
    }
    installOptions.cwd = config.root;
    installOptions.rollup = config.packageOptions.rollup;
    installOptions.sourcemap = config.buildOptions.sourcemap;
    installOptions.polyfillNode = config.packageOptions.polyfillNode;
    installOptions.packageLookupFields = config.packageOptions.packageLookupFields;
    installOptions.packageExportLookupFields = config.packageOptions.packageExportLookupFields;
    return installOptions;
  },

  // TODO: in build+watch, run prepare()
  //  then, no import map
  //

  async prepare(commandOptions: CommandOptions) {
    config = commandOptions.config;
    const DEV_DEPENDENCIES_DIR = path.join(
      PROJECT_CACHE_DIR,
      process.env.NODE_ENV || 'development',
    );
    const installDirectoryHashLoc = path.join(DEV_DEPENDENCIES_DIR, '.meta');
    const installDirectoryHash = await fs
      .readFile(installDirectoryHashLoc, 'utf-8')
      .catch(() => null);
    if (installDirectoryHash === 'v1') {
      logger.debug(`Install directory ".meta" tag is up-to-date. Welcome back!`);
      return;
    } else if (installDirectoryHash) {
      logger.info(
        'Snowpack updated! Rebuilding your dependencies for the latest version of Snowpack...',
      );
    } else {
      logger.info(
        `${colors.bold('Welcome to Snowpack!')} Because this is your first time running\n` +
          `this project${
            process.env.NODE_ENV === 'test' ? ` (mode: test)` : ``
          }, Snowpack needs to prepare your dependencies. This is a one-time step\n` +
          `and the results will be cached for the lifetime of your project. Please wait...`,
      );
    }
    const installTargets = await getInstallTargets(config, config.packageOptions.knownEntrypoints);
    if (installTargets.length === 0) {
      logger.info('No dependencies detected. Ready!');
      return;
    }
    await Promise.all(
      [...new Set(installTargets.map((t) => t.specifier))].map(async (spec) => {
        // Note: the "await" is important here for error messages! Do not remove
        return await this.resolvePackageImport(
          path.join(config.root, 'package.json'),
          spec,
          config,
        );
      }),
    );
    await inProgressBuilds.onIdle();
    await mkdirp(path.dirname(installDirectoryHashLoc));
    await fs.writeFile(installDirectoryHashLoc, 'v1', 'utf-8');
    logger.info(colors.bold('Ready!'));
    return;
  },

  async resolvePackageImport(
    source: string,
    spec: string,
    _config: SnowpackConfig,
    importMap?: ImportMap,
    depth = 0,
  ) {
    config = config || _config;
    // Imports in the same project should never change once resolved. Check the memoized cache here to speed up faster repeat page loads.
    // NOTE(fks): This is mainly needed because `resolveEntrypoint` can be slow and blocking, which creates issues when many files
    // are loaded/resolved at once (ex: antd). If we can improve the performance there and make that async, this may no longer be
    // necessary.
    if (!importMap) {
      if (!memoizedResolve[source]) {
        memoizedResolve[source] = {};
      } else if (memoizedResolve[source][spec]) {
        return memoizedResolve[source][spec];
      }
    }

    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'package') {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
    }

    const entrypoint = resolveEntrypoint(spec, {
      cwd: path.dirname(source),
      packageLookupFields: [
        'snowpack:source',
        ...((_config.packageOptions as PackageSourceLocal).packageLookupFields || []),
      ],
    });
    const specParts = spec.split('/');
    let _packageName: string = specParts.shift()!;
    if (_packageName?.startsWith('@')) {
      _packageName += '/' + specParts.shift();
    }
    const isSymlink = !entrypoint.includes(path.join('node_modules', _packageName));
    const isWithinRoot = config.workspaceRoot && entrypoint.startsWith(config.workspaceRoot);
    if (isSymlink && config.workspaceRoot && isWithinRoot) {
      const builtEntrypointUrls = getBuiltFileUrls(entrypoint, config);
      const builtEntrypointUrl = slash(
        path.relative(config.workspaceRoot, builtEntrypointUrls[0]!),
      );
      allSymlinkImports[builtEntrypointUrl] = entrypoint;
      return path.posix.join(config.buildOptions.metaUrlPath, 'link', builtEntrypointUrl);
    } else if (isSymlink && config.workspaceRoot !== false && !hasWorkspaceWarningFired) {
      hasWorkspaceWarningFired = true;
      logger.warn(
        colors.bold(`${spec}: Locally linked package detected outside of project root.\n`) +
          `If you are working in a workspace/monorepo, set your snowpack.config.js "workspaceRoot" to your workspace\n` +
          `directory to take advantage of fast HMR updates for linked packages. Otherwise, this package will be\n` +
          `cached until its package.json "version" changes. To silence this warning, set "workspaceRoot: false".`,
      );
    }

    if (importMap) {
      if (importMap.imports[spec]) {
        return path.posix.join(config.buildOptions.metaUrlPath, 'pkg', importMap.imports[spec]);
      }
      throw new Error(`Unexpected: spec ${spec} not included in import map.`);
    }

    let rootPackageDirectory = getRootPackageDirectory(entrypoint);
    if (!rootPackageDirectory) {
      const rootPackageManifestLoc = await findUp('package.json', {cwd: entrypoint});
      if (!rootPackageManifestLoc) {
        throw new Error(`Error resolving import ${spec}: No parent package.json found.`);
      }
      rootPackageDirectory = path.dirname(rootPackageManifestLoc);
    }
    const packageManifestLoc = path.join(rootPackageDirectory, 'package.json');
    const packageManifestStr = await fs.readFile(packageManifestLoc, 'utf8');
    const packageManifest = JSON.parse(packageManifestStr);
    const packageName = packageManifest.name || _packageName;
    const packageVersion = packageManifest.version || 'unknown';
    const DEV_DEPENDENCIES_DIR = path.join(
      PROJECT_CACHE_DIR,
      process.env.NODE_ENV || 'development',
    );
    const packageUID = packageName + '@' + packageVersion;
    const installDest = path.join(DEV_DEPENDENCIES_DIR, packageUID);

    allKnownSpecs.add(`${packageUID}:${spec}`);
    const newImportMap = await inProgressBuilds.add(
      async (): Promise<ImportMap> => {
        // Look up the import map of the already-installed package.
        // If spec already exists, then this import map is valid.
        const lineBullet = colors.dim(depth === 0 ? '+' : '└──'.padStart(depth * 2 + 1, ' '));
        let packageFormatted = spec + colors.dim('@' + packageVersion);
        const existingImportMapLoc = path.join(installDest, 'import-map.json');
        const existingImportMap =
          (await fs.stat(existingImportMapLoc).catch(() => null)) &&
          JSON.parse(await fs.readFile(existingImportMapLoc, 'utf8'));
        if (existingImportMap && existingImportMap.imports[spec]) {
          if (depth > 0) {
            logger.info(`${lineBullet} ${packageFormatted} ${colors.dim(`(dedupe)`)}`);
          }
          return existingImportMap;
        }
        // Otherwise, kick off a new build to generate a fresh import map.
        logger.info(`${lineBullet} ${packageFormatted}`);

        const installTargets = [...allKnownSpecs]
          .filter((spec) => spec.startsWith(packageUID))
          .map((spec) => spec.substr(packageUID.length + 1));
        // TODO: external should be a function in esinstall
        const externalPackages = [
          ...Object.keys(packageManifest.dependencies || {}),
          ...Object.keys(packageManifest.devDependencies || {}),
          ...Object.keys(packageManifest.peerDependencies || {}),
        ].filter((ext) => ext !== _packageName && !NEVER_PEER_PACKAGES.includes(ext));

        function getMemoizedResolveDependencyManifest() {
          const results = {};
          return (packageName: string) => {
            results[packageName] =
              results[packageName] ||
              _resolveDependencyManifest(packageName, rootPackageDirectory!);
            return results[packageName];
          };
        }
        const resolveDependencyManifest = getMemoizedResolveDependencyManifest();

        const installOptions: InstallOptions = {
          dest: installDest,
          cwd: packageManifestLoc,
          env: {NODE_ENV: process.env.NODE_ENV || 'development'},
          treeshake: false,
          sourcemap: config.buildOptions.sourcemap,
          alias: config.alias,
          external: externalPackages,
          // ESM<>CJS Compatability: If we can detect that a dependency is common.js vs. ESM, then
          // we can provide this hint to esinstall to improve our cross-package import support.
          externalEsm: (imp) => {
            const specParts = imp.split('/');
            let _packageName: string = specParts.shift()!;
            if (_packageName?.startsWith('@')) {
              _packageName += '/' + specParts.shift();
            }
            const [, result] = resolveDependencyManifest(_packageName);
            return !result || !isPackageCJS(result);
          },
        };
        if (config.packageOptions.source === 'local') {
          if (config.packageOptions.polyfillNode !== undefined) {
            installOptions.polyfillNode = config.packageOptions.polyfillNode;
          }
          if (config.packageOptions.packageLookupFields !== undefined) {
            installOptions.packageLookupFields = config.packageOptions.packageLookupFields;
          }
          if (config.packageOptions.namedExports !== undefined) {
            installOptions.namedExports = config.packageOptions.namedExports;
          }
        }
        const installResult = await installPackages({
          config,
          isDev: true,
          isSSR: false,
          installTargets,
          installOptions,
        });
        logger.debug(`${lineBullet} ${packageFormatted} DONE`);
        if (installResult.needsSsrBuild) {
          logger.info(`${lineBullet} ${packageFormatted} ${colors.dim(`(ssr)`)}`);
          await installPackages({
            config,
            isDev: true,
            isSSR: true,
            installTargets,
            installOptions: {
              ...installOptions,
              dest: installDest + '-ssr',
            },
          });
          logger.debug(`${lineBullet} ${packageFormatted} (ssr) DONE`);
        }
        const dependencyFileLoc = path.join(installDest, installResult.importMap.imports[spec]);
        const loadedFile = await fs.readFile(dependencyFileLoc!);
        if (isJavaScript(dependencyFileLoc)) {
          const packageImports = new Set<string>();
          const code = loadedFile.toString('utf8');
          for (const imp of await scanCodeImportsExports(code)) {
            const spec = code.substring(imp.s, imp.e);
            if (isRemoteUrl(spec)) {
              continue;
            }
            if (isPathImport(spec)) {
              continue;
            }
            packageImports.add(spec);
          }

          [...packageImports].map((packageImport) =>
            this.resolvePackageImport(entrypoint, packageImport, config, undefined, depth + 1),
          );
          // Kick off to a future event loop run, so that the `this.resolvePackageImport()` calls
          // above have a chance to enter the queue. Prevents a premature exit.
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
        return installResult.importMap;
      },
      {priority: depth},
    );

    const dependencyFileLoc = path.join(installDest, newImportMap.imports[spec]);

    // Flatten the import map value into a resolved, public import ID.
    // ex: "./react.js" -> "react.v17.0.1.js"
    const importId = newImportMap.imports[spec]
      .replace(/\//g, '.')
      .replace(/^\.+/g, '')
      .replace(/\.([^\.]*?)$/, `.v${packageVersion}.$1`);
    allPackageImports[importId] = {
      entrypoint,
      loc: dependencyFileLoc,
      installDest,
      packageName,
      packageVersion,
    };
    // Memoize the result, for faster repeat lookups.
    memoizedResolve[source][spec] = path.posix.join(
      config.buildOptions.metaUrlPath,
      'pkg',
      importId,
    );
    return memoizedResolve[source][spec];
  },

  clearCache() {
    return rimraf.sync(PROJECT_CACHE_DIR);
  },

  getCacheFolder() {
    return PROJECT_CACHE_DIR;
  },
} as PackageSource;
