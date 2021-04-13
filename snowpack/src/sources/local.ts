import Arborist from '@npmcli/arborist';
import crypto from 'crypto';
import {
  InstallOptions,
  InstallTarget,
  resolveDependencyManifest as _resolveDependencyManifest,
  resolveEntrypoint,
} from 'esinstall';
import projectCacheDir from 'find-cache-dir';
import findUp from 'find-up';
import {existsSync, promises as fs} from 'fs';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import pacote from 'pacote';
import path from 'path';
import rimraf from 'rimraf';
import slash from 'slash';
import {getBuiltFileUrls} from '../build/file-urls';
import {logger} from '../logger';
import {scanCodeImportsExports, transformFileImports} from '../rewrite-imports';
import {getInstallTargets} from '../scan-imports';
import {ImportMap, PackageOptionsLocal, PackageSource, SnowpackConfig} from '../types';
import {
  createInstallTarget,
  findMatchingAliasEntry,
  getExtension,
  GLOBAL_CACHE_DIR,
  isJavaScript,
  isPathImport,
  isRemoteUrl,
  parsePackageImportSpecifier,
  readFile,
} from '../util';
import {installPackages} from './local-install';

const CURRENT_META_FILE_CONTENTS = `.snowpack cache - Do not edit this directory!

The ".snowpack" cache directory is fully managed for you by Snowpack. 
Manual changes that you make to the files inside could break things.

Commit this directory to source control to speed up cold starts.

Found an issue? You can always delete the ".snowpack" 
directory and Snowpack will recreate it on next run.

[.meta.version=2]`;

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

/**
 * Return your source config, in object format. pacote, arborist, and cacahe
 * all support the same set of options here for configuring your npm registry.
 */
function getNpmConnectionOptions(source: string | object): object {
  if (source === 'local' || source === 'remote-next') {
    return {};
  } else if (typeof source === 'string') {
    return {registry: source};
  } else {
    return source;
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
  npmConnectionOptions: object;
  cacheDirectory: string;
  packageSourceDirectory: string;
  memoizedResolve: Record<string, string> = {};
  allPackageImports: Record<string, PackageImportData> = {};
  allSymlinkImports: Record<string, string> = {};
  allKnownSpecs = new Set<string>();
  allKnownProjectSpecs = new Set<string>();
  hasWorkspaceWarningFired = false;

  constructor(config: SnowpackConfig) {
    this.config = config;
    this.npmConnectionOptions = getNpmConnectionOptions(config.packageOptions.source);
    if (config.packageOptions.source === 'local') {
      this.cacheDirectory =
        projectCacheDir({name: 'snowpack'}) ||
        // If `projectCacheDir()` is null, no node_modules directory exists.
        // Use the current path (hashed) to create a cache entry in the global cache instead.
        // Because this is specifically for dependencies, this fallback should rarely be used.
        path.join(GLOBAL_CACHE_DIR, crypto.createHash('md5').update(process.cwd()).digest('hex'));
      this.packageSourceDirectory = config.root;
      this.arb = null;
    } else {
      this.cacheDirectory = path.join(config.root, '.snowpack');
      this.packageSourceDirectory = path.join(config.root, '.snowpack', 'source');
      this.arb = new Arborist({
        ...this.npmConnectionOptions,
        path: this.packageSourceDirectory,
        packageLockOnly: true,
      });
    }
  }

  private async setupCacheDirectory() {
    const {config, packageSourceDirectory, cacheDirectory} = this;
    await mkdirp(packageSourceDirectory);
    if (config.dependencies) {
      await fs.writeFile(
        path.join(packageSourceDirectory, 'package.json'),
        JSON.stringify(
          {
            '//': 'snowpack-mananged meta file. Do not edit this file!',
            dependencies: config.dependencies,
          },
          null,
          2,
        ),
        'utf8',
      );
      const lockfile = await fs.readFile(path.join(cacheDirectory, 'lock.json')).catch(() => null);
      if (lockfile) {
        await fs.writeFile(path.join(packageSourceDirectory, 'package-lock.json'), lockfile);
      } else {
        await fs.unlink(path.join(packageSourceDirectory, 'package-lock.json')).catch(() => null);
      }
    } else {
      await fs.unlink(path.join(packageSourceDirectory, 'package.json')).catch(() => null);
      await fs.unlink(path.join(packageSourceDirectory, 'package-lock.json')).catch(() => null);
    }
  }

  private async setupPackageRootDirectory(installTargets: InstallTarget[]) {
    const {arb, config} = this;
    const result = await arb.loadVirtual().catch(() => null);
    const packageNamesNeedInstall = new Set(
      installTargets
        .map((spec) => {
          let [_packageName] = parsePackageImportSpecifier(spec.specifier);
          // handle aliases
          const aliasEntry = findMatchingAliasEntry(config, _packageName);
          if (aliasEntry && aliasEntry.type === 'package') {
            const {from, to} = aliasEntry;
            _packageName = _packageName.replace(from, to);
          }
          if (!config.dependencies[_packageName]) {
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
      const savedPackageLockfileLoc = path.join(this.packageSourceDirectory, 'package-lock.json');
      const savedPackageLockfile = await fs.readFile(savedPackageLockfileLoc);
      await fs.writeFile(path.join(this.cacheDirectory, 'lock.json'), savedPackageLockfile);
    }
  }

  async prepare() {
    const installDirectoryHashLoc = path.join(this.cacheDirectory, '.meta');
    const installDirectoryHash = await fs
      .readFile(installDirectoryHashLoc, 'utf-8')
      .catch(() => null);

    if (installDirectoryHash === CURRENT_META_FILE_CONTENTS) {
      logger.debug(`Install directory ".meta" file is up-to-date. Welcome back!`);
    } else if (installDirectoryHash) {
      logger.info(
        'Snowpack updated! Rebuilding your dependencies for the latest version of Snowpack...',
      );
      await this.clearCache();
    } else {
      logger.info(
        `${colors.bold('Welcome to Snowpack!')} Because this is your first time running\n` +
          `this project, Snowpack needs to prepare your dependencies. This is a one-time step\n` +
          `and the results will be cached for the lifetime of your project. Please wait...`,
      );
    }

    const {config} = this;
    // If we're managing the the packages directory, setup some basic files.
    if (config.packageOptions.source !== 'local') {
      await this.setupCacheDirectory();
    }
    // Scan your project for imports.
    const installTargets = await getInstallTargets(config, config.packageOptions.knownEntrypoints);
    this.allKnownProjectSpecs = new Set(installTargets.map((t) => t.specifier));
    const allKnownPackageNames = new Set([
      ...[...this.allKnownProjectSpecs].map((spec) => parsePackageImportSpecifier(spec)[0]),
      ...Object.keys(config.dependencies),
    ]);
    // If we're managing the the packages directory, lookup & resolve the packages.
    if (config.packageOptions.source !== 'local') {
      await this.setupPackageRootDirectory(installTargets);
      await Promise.all(
        [...allKnownPackageNames].map((packageName) => this.installPackage(packageName)),
      );
    }
    for (const spec of this.allKnownProjectSpecs) {
      await this.buildPackageImport(spec);
    }
    // Save some metdata. Useful for next time.
    await mkdirp(path.dirname(installDirectoryHashLoc));
    await fs.writeFile(installDirectoryHashLoc, CURRENT_META_FILE_CONTENTS, 'utf-8');
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

  async modifyBuildInstallOptions(installOptions, installTargets) {
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
    if (config.packageOptions.source === 'local') {
      return installOptions;
    }
    installOptions.cwd = this.packageSourceDirectory;
    await this.setupCacheDirectory();
    await this.setupPackageRootDirectory(installTargets);
    const buildArb = new Arborist({
      ...this.npmConnectionOptions,
      path: this.packageSourceDirectory,
    });
    await buildArb.buildIdealTree();
    await buildArb.reify();
    return installOptions;
  }

  private async resolveArbNode(packageName: string, source: string): Promise<any> {
    const {config, arb} = this;
    if (config.packageOptions.source === 'local') {
      return false;
    }
    const lookupStr = path.relative(this.packageSourceDirectory, source);
    const lookupParts = lookupStr.split(path.sep);
    let lookupNode = arb.actualTree || arb.virtualTree;
    let exactLookupNode = lookupNode;
    // Use the souce file path to travel the dependency tree,
    // looking for the most specific match for packageName.
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
    // If no nested match was found, exactLookupNode is still the root node.
    return exactLookupNode.children.get(packageName);
  }

  private async installPackage(packageName: string, _source?: string): Promise<boolean> {
    const {config, arb} = this;
    const source = _source || this.packageSourceDirectory;
    if (config.packageOptions.source === 'local') {
      return false;
    }
    const arbNode = await this.resolveArbNode(packageName, source);
    if (!arbNode) {
      await arb.buildIdealTree({add: [packageName]});
      await arb.reify();
      // TODO: log this to the user somehow? Tell them to add the new package to dependencies obj?
      const savedPackageLockfileLoc = path.join(this.packageSourceDirectory, 'package-lock.json');
      const savedPackageLockfile = await fs.readFile(savedPackageLockfileLoc, 'utf-8');
      await fs.writeFile(path.join(this.cacheDirectory, 'lock.json'), savedPackageLockfile);
      // Retry.
      return this.installPackage(packageName, source);
    }
    if (existsSync(arbNode.path)) {
      return false;
    }
    await pacote.extract(arbNode.resolved, arbNode.path, this.npmConnectionOptions);
    return true;
  }

  private async buildPackageImport(spec: string, _source?: string, logLine = false, depth = 0) {
    const {config, memoizedResolve, allKnownSpecs, allPackageImports} = this;
    const source = _source || this.packageSourceDirectory;
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'package') {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
    }

    const [_packageName] = parsePackageImportSpecifier(spec);

    // Before doing anything, check for symlinks because symlinks shouldn't be built.
    try {
      const entrypoint = resolveEntrypoint(spec, {
        cwd: source,
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
      cwd: source,
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
    const packageUID = packageName + '@' + packageVersion;
    const installDest = path.join(this.cacheDirectory, 'build', packageUID);
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
      // Kick off a build, if needed.
      let importMap = existingImportMap;
      let needsBuild = !existingImportMap?.imports[spec];
      if (logLine || (depth === 0 && (!importMap || needsBuild))) {
        logLine = true;
        // TODO: We need to confirm version match, not just package import match
        const isDedupe = depth > 0 && (isKnownSpec || this.allKnownProjectSpecs.has(spec));
        logger.info(`${lineBullet} ${packageFormatted}${isDedupe ? colors.dim(` (dedupe)`) : ''}`);
      }
      if (!importMap || needsBuild) {
        const installTargets = [...allKnownSpecs]
          .filter((spec) => spec.startsWith(packageUID))
          .map((spec) => spec.substr(packageUID.length + 1));
        // TODO: external should be a function in esinstall
        const externalPackages = [
          ...Object.keys(packageManifest.dependencies || {}),
          ...Object.keys(packageManifest.peerDependencies || {}),
        ].filter((ext) => ext !== _packageName && !NEVER_PEER_PACKAGES.includes(ext));
        const externalPackagesFull = [
          ...externalPackages,
          ...Object.keys(packageManifest.devDependencies || {}).filter(
            (ext) => ext !== _packageName && !NEVER_PEER_PACKAGES.includes(ext),
          ),
        ];

        // To improve our ESM<>CJS conversion, we need to know the status of all dependencies.
        // This function returns a function, which can be used to fetch package.json manifests.
        // - When source = "local", this happens on the local file system (/w memoization).
        // - When source = "remote-next", this happens via remote manifest fetching (/w pacote caching).
        const getMemoizedResolveDependencyManifest = async () => {
          const results = {};
          if (config.packageOptions.source === 'local') {
            return (packageName: string) => {
              results[packageName] =
                results[packageName] ||
                _resolveDependencyManifest(packageName, rootPackageDirectory!)[1];
              return results[packageName];
            };
          }
          await Promise.all(
            externalPackages.map(async (externalPackage) => {
              const arbNode = await this.resolveArbNode(externalPackage, rootPackageDirectory!);
              results[arbNode.name] = await pacote.manifest(`${arbNode.name}@${arbNode.version}`, {
                ...this.npmConnectionOptions,
                fullMetadata: true,
              });
            }),
          );
          return (packageName: string) => {
            return results[packageName];
          };
        };
        const resolveDependencyManifest = await getMemoizedResolveDependencyManifest();
        const installOptions: InstallOptions = {
          dest: installDest,
          cwd: packageManifestLoc,
          // This installer is only ever run in development. In production, many packages
          // are installed together to take advantage of tree-shaking and package bundling.
          env: {NODE_ENV: 'development'},
          treeshake: false,
          sourcemap: config.buildOptions.sourcemap,
          alias: config.alias,
          external: externalPackagesFull,
          // ESM<>CJS Compatability: If we can detect that a dependency is common.js vs. ESM, then
          // we can provide this hint to esinstall to improve our cross-package import support.
          externalEsm: (imp) => {
            const [packageName] = parsePackageImportSpecifier(imp);
            const result = resolveDependencyManifest(packageName);
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
          const spec = code.substring(imp.s, imp.e).replace(/(\/|\\)+$/, ''); // remove trailing slash from end of specifier (easier for Node to resolve)
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
    const source = options.source || this.packageSourceDirectory;
    let spec = _spec;
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'package') {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
    }

    const entrypoint = resolveEntrypoint(spec, {
      cwd: source,
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
    const [packageName] = parsePackageImportSpecifier(spec);
    const isSymlink = !entrypoint.includes(path.join('node_modules', packageName));
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

  clearCache() {
    return rimraf.sync(this.cacheDirectory);
  }

  getCacheFolder() {
    return this.cacheDirectory;
  }
}
