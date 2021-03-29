import crypto from 'crypto';
import {
  InstallOptions,
  InstallTarget,
  resolveEntrypoint,
  resolveDependencyManifest as _resolveDependencyManifest,
} from 'esinstall';
import projectCacheDir from 'find-cache-dir';
import pacote from 'pacote';
import findUp from 'find-up';
import {existsSync, promises as fs} from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import Arborist from '@npmcli/arborist';
import rimraf from 'rimraf';
import slash from 'slash';
import {getBuiltFileUrls} from '../build/file-urls';
import {logger} from '../logger';
import {scanCodeImportsExports, transformFileImports} from '../rewrite-imports';
import {getInstallTargets} from '../scan-imports';
import {
  ImportMap,
  LockfileManifest,
  PackageSource,
  PackageOptionsLocal,
  SnowpackConfig,
} from '../types';
import {
  createInstallTarget,
  findMatchingAliasEntry,
  getExtension,
  GLOBAL_CACHE_DIR,
  isJavaScript,
  isPathImport,
  isRemoteUrl,
  readFile,
  readLockfile,
  LOCKFILE_NAME,
  writeLockfile,
} from '../util';
import {installPackages} from './local-install';

const PROJECT_CACHE_DIR =
  projectCacheDir({name: 'snowpack'}) ||
  // If `projectCacheDir()` is null, no node_modules directory exists.
  // Use the current path (hashed) to create a cache entry in the global cache instead.
  // Because this is specifically for dependencies, this fallback should rarely be used.
  path.join(GLOBAL_CACHE_DIR, crypto.createHash('md5').update(process.cwd()).digest('hex'));

const PKG_SOURCE_DIR = path.join(PROJECT_CACHE_DIR, 'source');

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

async function setupPackageRootDirectory(dir: string, lockfile: LockfileManifest) {
  await mkdirp(dir);
  if (lockfile.dependencies) {
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({dependencies: lockfile.dependencies}),
      'utf8',
    );
    // Check for "lockfileVersion" to guarentee that lockfile is in expected format (not legacy).
    if (lockfile.lock && lockfile.lock.lockfileVersion) {
      await fs.writeFile(path.join(dir, 'package-lock.json'), JSON.stringify(lockfile.lock, null, 2));
    } else {
      await fs.unlink(path.join(dir, 'package-lock.json')).catch(() => null);
    }
  } else {
    await fs.unlink(path.join(dir, 'package.json')).catch(() => null);;
    await fs.unlink(path.join(dir, 'package-lock.json')).catch(() => null);;
  }
}

type PackageImportData = {
  entrypoint: string;
  loc: string;
  installDest: string;
  packageVersion: string;
  packageName: string;
};

export class PackageSourceLocal implements PackageSource {
  config: SnowpackConfig;
  arb: Arborist;
  packageRootDirectory: string;
  lockfile: LockfileManifest = {dependencies: {}, lock: {}};
  memoizedResolve: Record<string, string> = {};
  allPackageImports: Record<string, PackageImportData> = {};
  allSymlinkImports: Record<string, string> = {};
  allKnownSpecs = new Set<string>();
  allKnownProjectSpecs = new Set<string>();
  hasWorkspaceWarningFired = false;

  constructor(config: SnowpackConfig) {
    this.config = config;
    this.arb = new Arborist({
      ...(typeof config.packageOptions.source === 'string' ? {} : config.packageOptions.source),
      path: PKG_SOURCE_DIR,
      packageLockOnly: true,
    });
    this.packageRootDirectory =
      config.packageOptions.source === 'local' ? config.root : PKG_SOURCE_DIR;
  }

  private async installPackageRootDirectory(installTargets: InstallTarget[]) {
    const {arb, config} = this;
    const result = await arb.loadVirtual().catch(() => null);
    const packageNamesNeedInstall = new Set(
      installTargets
        .map((spec) => {
          const specParts = spec.specifier.split('/');
          let _packageName: string = specParts.shift()!;
          if (_packageName?.startsWith('@')) {
            _packageName += '/' + specParts.shift();
          }
          // IMPRVE DOCS: handle aliases
          const aliasEntry = findMatchingAliasEntry(config, _packageName);
          if (aliasEntry && aliasEntry.type === 'package') {
            const {from, to} = aliasEntry;
            _packageName = _packageName.replace(from, to);
          }
          if (!this.lockfile.dependencies[_packageName]) {
            return _packageName;
          }
          // Needed to make TS happy. Gets filtered out in next step.
          return '';
        })
        .filter(Boolean),
    );

    const needsInstall = result
      ? [...packageNamesNeedInstall].every((name) => !result.children.get(name))
      : true;
    if (needsInstall) {
      await arb.buildIdealTree({add: [...packageNamesNeedInstall]});
      await arb.reify();
    }
    if (packageNamesNeedInstall.size > 0) {
      const savedPackageLockfileLoc = path.join(PKG_SOURCE_DIR, 'package-lock.json');
      const savedPackageLockfile = JSON.parse(await fs.readFile(savedPackageLockfileLoc, 'utf-8'));
      const newLockfile: LockfileManifest = {
        dependencies: {...this.lockfile.dependencies},
        lock: savedPackageLockfile,
      };
      await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
    }
  }

  async prepare() {
    this.lockfile = (await readLockfile(this.config.root)) || this.lockfile;
    const {config, lockfile} = this;

    const DEV_DEPENDENCIES_DIR = path.join(
      PROJECT_CACHE_DIR,
      process.env.NODE_ENV || 'development',
    );
    const installDirectoryHashLoc = path.join(DEV_DEPENDENCIES_DIR, '.meta');
    const installDirectoryHash = await fs
      .readFile(installDirectoryHashLoc, 'utf-8')
      .catch(() => null);

    if (installDirectoryHash === 'v2') {
      logger.debug(`Install directory ".meta" tag is up-to-date. Welcome back!`);
    } else if (installDirectoryHash) {
      logger.info(
        'Snowpack updated! Rebuilding your dependencies for the latest version of Snowpack...',
      );
      await PackageSourceLocal.clearCache();
    } else {
      logger.info(
        `${colors.bold('Welcome to Snowpack!')} Because this is your first time running\n` +
          `this project${
            process.env.NODE_ENV === 'test' ? ` (mode: test)` : ``
          }, Snowpack needs to prepare your dependencies. This is a one-time step\n` +
          `and the results will be cached for the lifetime of your project. Please wait...`,
      );
    }

    // If we're managing the the packages directory, setup some basic files.
    if (config.packageOptions.source !== 'local') {
      await setupPackageRootDirectory(this.packageRootDirectory, lockfile);
    }
    // Scan your project for imports.
    const installTargets = await getInstallTargets(config, config.packageOptions.knownEntrypoints);
    this.allKnownProjectSpecs = new Set(installTargets.map((t) => t.specifier));
    // If we're managing the the packages directory, lookup & resolve the packages.
    if (config.packageOptions.source !== 'local') {
      await this.installPackageRootDirectory(installTargets);
    }
    // Build every imported package.
    for (const spec of this.allKnownProjectSpecs) {
      await this.buildPackageImport(spec);
    }
    // Save some metdata. Useful for next time.
    await mkdirp(path.dirname(installDirectoryHashLoc));
    await fs.writeFile(installDirectoryHashLoc, 'v2', 'utf-8');
    logger.info(colors.bold('Ready!'));
    return;
  }

  async prepareSingleFile(fileLoc: string) {
    const {config, allKnownProjectSpecs} = this;
    // get install targets (imports) for a single file.
    const installTargets = await getInstallTargets(config, config.packageOptions.knownEntrypoints, [
      {
        baseExt: getExtension(fileLoc),
        root: config.root,
        locOnDisk: fileLoc,
        contents: await readFile(fileLoc),
      },
    ]);
    // Filter out all known imports, we're only looking for new ones.
    const newImports = installTargets.filter((t) => !allKnownProjectSpecs.has(t.specifier));
    // Build all new package imports.
    for (const spec of newImports) {
      await this.buildPackageImport(spec.specifier);
      allKnownProjectSpecs.add(spec.specifier);
    }
  }

  async load(id: string, {isSSR}: {isSSR?: boolean} = {}) {
    const {config, allPackageImports} = this;
    const packageImport = allPackageImports[id];
    if (!packageImport) {
      return;
    }
    const {loc, entrypoint, packageName, packageVersion} = packageImport;
    let {installDest} = packageImport;
    if (isSSR && existsSync(installDest + '-ssr')) {
      installDest += '-ssr';
    }
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
          return await this.resolvePackageImport(spec, {source: entrypoint});
        }
        // Otherwise, create a relative import ID for the internal file.
        const relativeImportId = path.posix.join(`${packageName}.v${packageVersion}`, resolvedSpec);
        this.allPackageImports[relativeImportId] = {
          entrypoint: path.join(installDest, 'package.json'),
          loc: newLoc,
          installDest,
          packageVersion,
          packageName,
        };
        return path.posix.join(config.buildOptions.metaUrlPath, 'pkg', relativeImportId);
      }
      // Otherwise, resolve this specifier as an external package.
      return await this.resolvePackageImport(spec, {source: entrypoint});
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
  }

  modifyBuildInstallOptions(installOptions) {
    const config = this.config;
    if (config.packageOptions.source === 'remote') {
      return installOptions;
    }
    installOptions.cwd = config.root;
    installOptions.rollup = config.packageOptions.rollup;
    installOptions.sourcemap = config.buildOptions.sourcemap;
    installOptions.polyfillNode = config.packageOptions.polyfillNode;
    installOptions.packageLookupFields = config.packageOptions.packageLookupFields;
    installOptions.packageExportLookupFields = config.packageOptions.packageExportLookupFields;
    return installOptions;
  }

  private async installPackage(packageName: string, source: string): Promise<boolean> {
    const {config, arb} = this;
    if (config.packageOptions.source === 'local') {
      return false;
    }
    const lookupStr = path.relative(this.packageRootDirectory, source);
    const lookupParts = lookupStr.split(path.sep);
    let lookupNode = arb.actualTree || arb.virtualTree;
    let exactLookupNode = lookupNode;
    while (lookupNode && lookupNode.children && lookupParts.length > 0) {
      const part = lookupParts.shift();
      if (part !== 'node_modules') {
        continue;
      }
      let lookupPackageName = lookupParts.shift()!;
      if (lookupPackageName.startsWith('@')) {
        lookupPackageName += '/' + lookupParts.shift()!;
      }
      lookupNode = lookupNode.children.get(lookupPackageName);
      if (lookupNode && lookupNode.children.has(packageName)) {
        exactLookupNode = lookupNode;
      }
    }

    const arbNode = exactLookupNode.children.get(packageName);
    if (!arbNode) {
      const packageNamesNeedInstall = [packageName];
      await arb.buildIdealTree({add: [packageName]});
      await arb.reify();
      const savedPackageLockfileLoc = path.join(this.packageRootDirectory, 'package-lock.json');
      const savedPackageLockfile = JSON.parse(await fs.readFile(savedPackageLockfileLoc, 'utf-8'));
      const newDependencies = {...this.lockfile.dependencies};
      for (const newPackage of packageNamesNeedInstall) {
        newDependencies[newPackage] = '^' + this.arb.actualTree.children.get(newPackage).version;
      }
      const newLockfile: LockfileManifest = {
        dependencies: newDependencies,
        lock: savedPackageLockfile,
      };
      await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
      // Retry.
      return this.installPackage(packageName, source);
    }
    if (existsSync(arbNode.path)) {
      return false;
    }
    await pacote.extract(arbNode.resolved, arbNode.path);
    return true;
  }

  private async buildPackageImport(spec: string, _source?: string, logLine = false, depth = 0) {
    const {config, memoizedResolve, allKnownSpecs, allPackageImports} = this;
    const source = _source || this.packageRootDirectory;
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'package') {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
    }

    const specParts = spec.split('/');
    let _packageName: string = specParts.shift()!;
    if (_packageName?.startsWith('@')) {
      _packageName += '/' + specParts.shift();
    }

    // Before doing anything, check for symlinks because symlinks shouldn't be built.
    try {
      const entrypoint = resolveEntrypoint(spec, {
        cwd: path.dirname(source),
        packageLookupFields: [
          'snowpack:source',
          ...((config.packageOptions as PackageOptionsLocal).packageLookupFields || []),
        ],
      });
      const isSymlink = !entrypoint.includes(path.join('node_modules', _packageName));
      if (isSymlink) {
        return;
      }
    } catch (err) {
      // that's fine, package just doesn't exist yet. Go download it.
    }

    await this.installPackage(_packageName, source);
    const entrypoint = resolveEntrypoint(spec, {
      cwd: path.dirname(source),
      packageLookupFields: [
        'snowpack:source',
        ...((config.packageOptions as PackageOptionsLocal).packageLookupFields || []),
      ],
    });

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
    const isKnownSpec = allKnownSpecs.has(`${packageUID}:${spec}`);
    allKnownSpecs.add(`${packageUID}:${spec}`);

    // NOTE(@fks): This build step used to use a queue system, which allowed multiple
    // parallel builds at once. Unfortunately, these builds are compute heavy and not well
    // parallelized, so the queue was removed but the standalone inline function remains.
    const newImportMap = await (async (): Promise<ImportMap> => {
      // Look up the import map of the already-installed package.
      // If spec already exists, then this import map is valid.
      const lineBullet = colors.dim(depth === 0 ? '+' : '└──'.padStart(depth * 2 + 1, ' '));
      let packageFormatted = spec + colors.dim('@' + packageVersion);
      const existingImportMapLoc = path.join(installDest, 'import-map.json');
      const existingImportMap: ImportMap | null =
        (await fs.stat(existingImportMapLoc).catch(() => null)) &&
        JSON.parse(await fs.readFile(existingImportMapLoc, 'utf8'));
      // Kick off a build, if needed
      let importMap = existingImportMap;
      let needsBuild = !existingImportMap?.imports[spec];
      if (!importMap || needsBuild) {
        if (logLine || depth === 0) {
          logLine = true;
          // TODO: We need to confirm version match, not just package import match
          const isDedupe = depth > 0 && (isKnownSpec || this.allKnownProjectSpecs.has(spec));
          logger.info(
            `${lineBullet} ${packageFormatted}${isDedupe ? colors.dim(` (dedupe)`) : ''}`,
          );
        }
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
        importMap = installResult.importMap;
      }
      const dependencyFileLoc = path.join(installDest, importMap.imports[spec]);
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

        for (const packageImport of packageImports) {
          await this.buildPackageImport(packageImport, entrypoint, logLine, depth + 1);
        }
      }
      return importMap;
    })();

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
    // Memoize the result, for faster runtime lookups.
    memoizedResolve[entrypoint] = importId;
    return memoizedResolve[entrypoint];
  }

  async resolvePackageImport(
    _spec: string,
    options: {source?: string; importMap?: ImportMap; isRetry?: boolean} = {},
  ) {
    const {config, memoizedResolve, allSymlinkImports} = this;
    const source = options.source || this.packageRootDirectory;
    let spec = _spec;
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'package') {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
    }

    const entrypoint = resolveEntrypoint(spec, {
      cwd: path.dirname(source),
      packageLookupFields: [
        'snowpack:source',
        ...((config.packageOptions as PackageOptionsLocal).packageLookupFields || []),
      ],
    });

    // Imports in the same project should never change once resolved. Check the memoized cache here to speed up faster repeat page loads.
    // NOTE(fks): This is mainly needed because `resolveEntrypoint` can be slow and blocking, which creates issues when many files
    // are loaded/resolved at once (ex: antd). If we can improve the performance there and make that async, this may no longer be
    // necessary.
    if (!options.importMap) {
      if (memoizedResolve[entrypoint]) {
        return path.posix.join(config.buildOptions.metaUrlPath, 'pkg', memoizedResolve[entrypoint]);
      }
    }
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
    } else if (isSymlink && config.workspaceRoot !== false && !this.hasWorkspaceWarningFired) {
      this.hasWorkspaceWarningFired = true;
      logger.warn(
        colors.bold(`${spec}: Locally linked package detected outside of project root.\n`) +
          `If you are working in a workspace/monorepo, set your snowpack.config.js "workspaceRoot" to your workspace\n` +
          `directory to take advantage of fast HMR updates for linked packages. Otherwise, this package will be\n` +
          `cached until its package.json "version" changes. To silence this warning, set "workspaceRoot: false".`,
      );
    }

    if (options.importMap) {
      if (options.importMap.imports[spec]) {
        return path.posix.join(
          config.buildOptions.metaUrlPath,
          'pkg',
          options.importMap.imports[spec],
        );
      }
      throw new Error(`Unexpected: spec ${spec} not included in import map.`);
    }
    // Unscanned package imports can happen. Warn the user, and then build the import individually.
    logger.warn(
      colors.bold(`${spec}: Unscannable package import found.\n`) +
        `Snowpack scans source files for package imports at startup, and on every change.\n` +
        `But, sometimes an import gets added during the build process, invisible to our file scanner.\n` +
        `We'll prepare this package for you now, but should add "${spec}" to "knownEntrypoints"\n` +
        `in your config file so that this gets prepared with the rest of your imports during startup.`,
    );
    // Built the new import, and then try resolving again.
    if (options.isRetry) {
      throw new Error(`Unexpected: Unscanned package import couldn't be built/resolved.`);
    }
    await this.buildPackageImport(_spec, options.source, true);
    return this.resolvePackageImport(_spec, {source: options.source, isRetry: true});
  }

  static clearCache() {
    return rimraf.sync(PROJECT_CACHE_DIR);
  }

  /** @deprecated */
  clearCache() {
    return rimraf.sync(PROJECT_CACHE_DIR);
  }

  getCacheFolder() {
    return PROJECT_CACHE_DIR;
  }
}
