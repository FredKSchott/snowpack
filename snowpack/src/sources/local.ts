import crypto from 'crypto';
import {InstallOptions, InstallTarget, resolveEntrypoint} from 'esinstall';
import projectCacheDir from 'find-cache-dir';
import {existsSync, promises as fs} from 'fs';
import PQueue from 'p-queue';
import * as colors from 'kleur/colors';
import slash from 'slash';
import path from 'path';
import rimraf from 'rimraf';
import {getBuiltFileUrls} from '../build/file-urls';
import {logger} from '../logger';
import {scanCodeImportsExports, transformFileImports} from '../rewrite-imports';
import {getInstallTargets} from '../scan-imports';
import {
  CommandOptions,
  ImportMap,
  PackageSource,
  SnowpackConfig,
  PackageSourceLocal,
} from '../types';
import {createInstallTarget, GLOBAL_CACHE_DIR, isJavaScript, isRemoteUrl} from '../util';
import {installPackages} from './local-install';
import findUp from 'find-up';

const PROJECT_CACHE_DIR =
  projectCacheDir({name: 'snowpack'}) ||
  // If `projectCacheDir()` is null, no node_modules directory exists.
  // Use the current path (hashed) to create a cache entry in the global cache instead.
  // Because this is specifically for dependencies, this fallback should rarely be used.
  path.join(GLOBAL_CACHE_DIR, crypto.createHash('md5').update(process.cwd()).digest('hex'));

const DEV_DEPENDENCIES_DIR = path.join(PROJECT_CACHE_DIR, process.env.NODE_ENV || 'development');

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
      if (spec.startsWith('./') || spec.startsWith('../')) {
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
      const resolvedSpec = await resolveImport(spec);
      imports.push(
        createInstallTarget(
          path.resolve(path.posix.join(config.buildOptions.metaUrlPath, 'pkg', id), resolvedSpec),
        ),
      );
      return resolvedSpec;
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
        `${colors.bold(
          'Welcome to Snowpack!',
        )} Because this is your first time running this project${
          process.env.NODE_ENV === 'test' ? ` (mode: test)` : ``
        }, \n` +
          'Snowpack needs to prepare your dependencies. This is a one-time step and the results \n' +
          'will be reused for the lifetime of your project. Please wait while we prepare...',
      );
    }
    const installTargets = await getInstallTargets(
      config,
      config.packageOptions.source === 'local' ? config.packageOptions.knownEntrypoints : [],
    );
    if (installTargets.length === 0) {
      logger.info('No dependencies detected. Set up complete!');
      return;
    }
    await Promise.all(
      [
        ...new Set(
          installTargets
            .map((t) => t.specifier)
            // external packages need not prepare
            .filter((t) => !config.packageOptions?.external.includes(t)),
        ),
      ].map((spec) => {
        return this.resolvePackageImport(path.join(config.root, 'package.json'), spec, config);
      }),
    );
    await fs.writeFile(installDirectoryHashLoc, 'v1', 'utf-8');
    logger.info(colors.bold('Set up complete!'));
    return;
  },

  async resolvePackageImport(source: string, spec: string, _config: SnowpackConfig) {
    config = config || _config;
    const entrypoint = resolveEntrypoint(spec, {
      cwd: path.dirname(source),
      packageLookupFields: (_config.packageOptions as PackageSourceLocal).packageLookupFields || [],
    });
    const specParts = spec.split('/');
    let _packageName: string = specParts.shift()!;
    if (_packageName?.startsWith('@')) {
      _packageName += '/' + specParts.shift();
    }
    const isSymlink = !entrypoint.includes(path.join('node_modules', _packageName));
    const isWithinRoot = entrypoint.startsWith(config.root);
    if (isSymlink && isWithinRoot) {
      const builtEntrypointUrls = getBuiltFileUrls(entrypoint, config);
      const builtEntrypointUrl = slash(path.relative(config.root, builtEntrypointUrls[0]!));
      allSymlinkImports[builtEntrypointUrl] = entrypoint;
      return path.posix.join(config.buildOptions.metaUrlPath, 'link', builtEntrypointUrl);
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
    const installDest = path.join(DEV_DEPENDENCIES_DIR, packageName + '@' + packageVersion);

    let isNew = !allKnownSpecs.has(spec);
    allKnownSpecs.add(spec);
    const [newImportMap, loadedFile] = await inProgressBuilds.add(
      async (): Promise<[ImportMap, Buffer]> => {
        // Look up the import map of the already-installed package.
        // If spec already exists, then this import map is valid.
        const existingImportMapLoc = path.join(installDest, 'import-map.json');
        const existingImportMap =
          (await fs.stat(existingImportMapLoc).catch(() => null)) &&
          JSON.parse(await fs.readFile(existingImportMapLoc, 'utf8'));
        if (existingImportMap && existingImportMap.imports[spec]) {
          logger.debug(spec + ' CACHED! (already exists)');
          const dependencyFileLoc = path.join(installDest, existingImportMap.imports[spec]);
          return [existingImportMap, await fs.readFile(dependencyFileLoc!)];
        }
        // Otherwise, kick off a new build to generate a fresh import map.
        logger.info(colors.yellow(`⦿ ${spec}`));

        const installTargets = [...allKnownSpecs].filter(
          (spec) => spec === _packageName || spec.startsWith(_packageName + '/'),
        );
        // TODO: external should be a function in esinstall
        const externalPackages = [
          ...Object.keys(packageManifest.dependencies || {}),
          ...Object.keys(packageManifest.devDependencies || {}),
          ...Object.keys(packageManifest.peerDependencies || {}),
        ];

        const installOptions: InstallOptions = {
          dest: installDest,
          cwd: packageManifestLoc,
          env: {NODE_ENV: process.env.NODE_ENV || 'development'},
          treeshake: false,
          external: externalPackages,
          externalEsm: externalPackages,
          sourcemap: config.buildOptions.sourcemap,
          alias: config.alias,
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
        const {importMap: newImportMap, needsSsrBuild} = await installPackages({
          config,
          isDev: true,
          isSSR: false,
          installTargets,
          installOptions,
        });
        logger.debug(colors.yellow(`⦿ ${spec} DONE`));
        if (needsSsrBuild) {
          logger.info(colors.yellow(`⦿ ${spec} (ssr)`));
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
          logger.debug(colors.yellow(`⦿ ${spec} (ssr) DONE`));
        }
        if (isSymlink) {
          logger.info(
            colors.bold(`Locally linked package detected outside of project root.\n`) +
              `Locally linked/symlinked packages are treated as static by default, and will not be\n` +
              `rebuilt until its "package.json" version changes. To enable local updates for this\n` +
              `package, set your project root to match your monorepo/workspace root directory.`,
          );
        }
        const dependencyFileLoc = path.join(installDest, newImportMap.imports[spec]);
        return [newImportMap, await fs.readFile(dependencyFileLoc!)];
      },
    );

    const dependencyFileLoc = path.join(installDest, newImportMap.imports[spec]);
    if (isNew && isJavaScript(dependencyFileLoc)) {
      await inProgressBuilds.onIdle();
      const packageImports = new Set<string>();
      const code = loadedFile.toString('utf8');
      for (const imp of await scanCodeImportsExports(code)) {
        const spec = code.substring(imp.s, imp.e);
        if (isRemoteUrl(spec)) {
          continue;
        }
        if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
          continue;
        }
        packageImports.add(spec);
      }
      await Promise.all(
        [...packageImports].map((packageImport) =>
          this.resolvePackageImport(entrypoint, packageImport, config),
        ),
      );
    }

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
    return path.posix.join(config.buildOptions.metaUrlPath, 'pkg', importId);
  },

  clearCache() {
    return rimraf.sync(PROJECT_CACHE_DIR);
  },

  getCacheFolder() {
    return PROJECT_CACHE_DIR;
  },
} as PackageSource;
