import fs from 'fs';
import url from 'url';
import path from 'path';
import del from 'del';
import globalCacheDir from 'cachedir';
import nodeBuiltins from 'builtin-modules';
import cjsModuleLexer from 'cjs-module-lexer';
import esModuleLexer from 'es-module-lexer';
import type {Manifest} from 'pacote';
import * as esbuild from 'esbuild';
import glob from 'tiny-glob';
import {ImportMap, PackageSource, SnowpackConfig} from '../types';
import {findMatchingAliasEntry} from '../util';

const BROWSER_SUBPATHS = new Set(['browser', 'import', 'default']); // earlier order takes priority (also "default" is required!)
const NODE_ESM_SUBPATHS = new Set(['import', 'default']);
const NODE_CJS_SUBPATHS = new Set(['require', 'node', 'default']);
const NODE_BUILTINS = new Set([...nodeBuiltins]);
const ESBUILD_EXTENSIONS = new Set(['.cjs', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx']);

export class PackageSourceV4 implements PackageSource {
  cacheDir: URL;
  config: SnowpackConfig;
  importMap: ImportMap;
  target: 'browser' | 'node-esm' | 'node-cjs' = 'browser';
  mode: 'development' | 'production' = 'development';
  pkgPrefix = '/_snowpack/pkg/';
  /** packages to always bundle (i.e. don’t mark as "external") */
  private alwaysBundle = new Set<string>();

  constructor(config: SnowpackConfig) {
    // load config
    this.config = config;

    // cache
    if (config.buildOptions.cacheDirPath) {
      this.cacheDir = new URL(`file://${path.resolve(config.buildOptions.cacheDirPath)}/`);
    } else {
      this.cacheDir = new URL(`file://${globalCacheDir('snowpack')}/`);
    }

    // target
    if (config.buildOptions.ssr) {
      this.target = 'node-cjs'; // should "node-esm" ever be used?
    }

    // mode
    if (config.mode === 'production') {
      this.mode = 'production';
      process.env.NODE_ENV = 'production';
    }

    // prefix
    this.pkgPrefix = config.buildOptions.metaUrlPath + '/pkg/';

    // imports
    const importMapLoc = new URL('./import-map.json', this.cacheDir);
    if (fs.existsSync(importMapLoc)) {
      this.importMap = JSON.parse(fs.readFileSync(importMapLoc, 'utf8')); // load and cache if exists on disk
    } else {
      this.importMap = {imports: {}}; // if new, create new one to be written later
    }
  }

  async prepare() {}
  async prepareSingleFile(fileLoc) {
    console.log({single: url.fileURLToPath(fileLoc)});
  }

  async load(id: string) {
    const spec = id.replace(new RegExp(`^${this.pkgPrefix}`), '');
    const NotFoundError = new Error(`Could not locate "${spec}"`);
    const resolved = this.importMap.imports[spec];
    if (!resolved) throw NotFoundError;

    const filename = new URL(resolved, this.cacheDir);
    const contents = await fs.promises.readFile(filename);
    return {
      contents: await this.transformImports({filename, contents}),
      imports: [],
    };
  }

  async resolvePackageImport(originalSpec): Promise<string> {
    let spec = originalSpec;

    // 0. if node built-in, return
    if (NODE_BUILTINS.has(originalSpec)) return originalSpec;

    // 1. handle aliases
    const aliasEntry = findMatchingAliasEntry(this.config, spec);
    if (aliasEntry && aliasEntry.type === 'package') {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
    }

    // 2. parse spec
    const pkgInfo = this.parseSpec(spec);
    if (!pkgInfo) return spec;

    // 3. use resolve cache if present
    const {name: packageName, subpath} = pkgInfo;
    let importID = packageName + subpath.replace(/^\./, '');
    const cached = this.importMap.imports[importID];
    if (cached) {
      return this.pkgPrefix + cached.replace(/^\.\//, '');
    }

    // 4. resolve package, load deps
    const {manifest, cwd} = await this.findPkg(spec);
    const pkgID = `${packageName}@${manifest.version}`;
    const outdir = new URL(pkgID + '/', this.cacheDir);
    const external = new Set<string>();
    // deps are external
    for (const dep of [
      ...Object.keys(manifest.dependencies || {}),
      ...Object.keys(manifest.peerDependencies || {}),
    ].filter((pkg) => !this.alwaysBundle.has(pkg))) {
      external.add(dep);
    }
    // so are already-built packages
    for (const key of Object.keys(this.importMap.imports)) {
      const pkgInfo = this.parseSpec(key);
      if (!pkgInfo || pkgInfo.name === packageName) continue; // don’t mark itself as external
      external.add(pkgInfo.name);
    }

    // 5. build core pkg
    const entryPoints = await this.findEntryPoints(manifest, {cwd});
    const esbuildEntryPoints: Record<string, string> = {};
    for (const [k, v] of Object.entries(entryPoints)) {
      esbuildEntryPoints[
        k === '.' ? 'index' : k.replace(/^\.\//, '').replace(/\.js$/, '')
      ] = url.fileURLToPath(v);
    }
    await this.buildPackage({
      bundle: true,
      define: {
        'process.env.NODE_ENV': `"${this.mode}"`,
      },
      entryPoints: esbuildEntryPoints,
      external: [...external],
      format: this.target === 'node-cjs' ? 'cjs' : 'esm',
      minify: this.mode === 'production',
      outdir: url.fileURLToPath(outdir),
      platform: 'node',
      target: this.target.startsWith('node-') ? 'node16' : 'es2019',
      write: true,
    });

    // 6. add all entryPoints to cache
    const localImports: Record<string, string> = {};
    this.importMap.imports[packageName] = `./${pkgID}/index.js`;
    this.importMap.imports[pkgID] = `./${pkgID}/index.js`;
    this.importMap.imports[`${pkgID}/index.js`] = `./${pkgID}/index.js`;
    localImports[packageName] = `./index.js`;
    localImports[pkgID] = `./index.js`;
    localImports[`${pkgID}/index.js`] = `./index.js`;
    for (const k of Object.keys(entryPoints)) {
      const key = k === '.' ? 'index' : k.replace(/^\.\//, '');
      const value = path.extname(key) ? key : key + '.js';
      this.importMap.imports[`${packageName}/${key}`] = `./${pkgID}/${value}`;
      this.importMap.imports[`${pkgID}/${key}`] = `./${pkgID}/${value}`;
      localImports[`${packageName}/${key}`] = `./${value}`;
      localImports[`${pkgID}/${key}`] = `./${value}`;
      if (!path.extname(key)) {
        this.importMap.imports[`${packageName}/${key}.js`] = `./${pkgID}/${value}`;
        this.importMap.imports[`${pkgID}/${key}.js`] = `./${pkgID}/${value}`;
        localImports[`${packageName}/${key}.js`] = `./${value}`;
        localImports[`${pkgID}/${key}.js`] = `./${value}`;
      }
    }

    // 7. process dependencies
    await Promise.all([...external].map((pkg) => this.resolvePackageImport(pkg)));

    // 8. write import-map.json
    const importKeys = Object.keys(this.importMap.imports);
    importKeys.sort((a, b) => a.localeCompare(b, 'en-us', {numeric: true}));
    const sortedImports: Record<string, string> = {};
    for (const k of importKeys) {
      sortedImports[k] = this.importMap.imports[k];
    }
    await fs.writeFileSync(
      new URL('import-map.json', this.cacheDir),
      JSON.stringify({...this.importMap, imports: sortedImports}, undefined, 2),
      'utf8',
    );
    await fs.writeFileSync(
      new URL('import-map.json', outdir),
      JSON.stringify({imports: localImports}, undefined, 2),
      'utf8',
    );

    // 9. finish
    const resolved = `${this.pkgPrefix}${pkgID}${subpath === '.' ? '/index.js' : subpath}`;
    return resolved;
  }

  async modifyBuildInstallOptions(opts) {
    return opts;
  }

  getCacheFolder() {
    return url.fileURLToPath(this.cacheDir);
  }

  async clearCache() {
    await del(url.fileURLToPath(this.cacheDir));
  }

  // internal
  /** Given an import specifier, return npm package info, or "undefined" if it’s non-npm */
  private parseSpec(
    spec: string,
  ):
    | {
        name: string;
        subpath: string;
        namespace?: string;
        isScoped: boolean;
      }
    | undefined {
    if (spec[0] === '.' || spec[0] === '/' || spec.includes('://')) return undefined; // relative spec, or remote spec

    let name = spec;

    // namespace
    let namespace: string | undefined;
    let namespaceMatch = name.match(/([a-zA-Z]+):(.*)/);
    if (namespaceMatch && namespaceMatch.length === 3) {
      namespace = namespaceMatch[1];
      name = namespaceMatch[2];
    }

    // scope
    let isScoped = false;
    if (name[0] === '@') isScoped = true;

    // subpath
    let parts = name.split('/');
    name = parts.shift() as string;
    if (isScoped) {
      name = parts.shift() as string;
    }
    let subpath = parts.join('/');
    if (subpath) subpath = '/' + subpath;
    if (!subpath) subpath = '.';

    return {
      name,
      namespace,
      isScoped,
      subpath: subpath,
    };
  }

  /** Build package (with some retry logic) */
  private async buildPackage(options: esbuild.BuildOptions) {
    try {
      await esbuild.build({...options});
    } catch (errors) {
      // retry scenario 1: if an external package isn’t marked in dependencies, try a rebuild with that
      const [err] = errors.errors || [];
      if (err.text && err.text.includes('mark it as external to exclude it from the bundle')) {
        const packageMatch = err.text.match(/Could not resolve "([^"]+)"/);
        const missingPkg = this.parseSpec(packageMatch[1] || '');
        if (missingPkg && !(options.external || []).includes(missingPkg.name)) {
          await this.resolvePackageImport(missingPkg.name); // build package externally
          return this.buildPackage({
            ...options,
            external: [...(options.external || []), missingPkg.name],
          });
        }
      }
      throw err;
    }
  }

  /** Get a package.json manifest and cwd for any spec */
  private async findPkg(spec: string): Promise<{manifest: Manifest; cwd: URL}> {
    let searchLoc = require.resolve(spec);
    let foundPkgManifests: string[] = [];
    let pkgManifestLoc = path.join(searchLoc, 'package.json');
    while (searchLoc !== path.dirname(searchLoc)) {
      if (fs.existsSync(pkgManifestLoc)) foundPkgManifests.push(pkgManifestLoc);
      searchLoc = path.dirname(searchLoc);
      pkgManifestLoc = path.join(searchLoc, 'package.json');
    }
    if (!foundPkgManifests.length) {
      throw new Error(`Could not locate package.json for "${spec}"`);
    }
    const foundPkgs = await Promise.all<{manifest: Manifest; cwd: URL}>(
      foundPkgManifests.map(async (manifestLoc) => ({
        manifest: JSON.parse(await fs.promises.readFile(manifestLoc, 'utf8')),
        cwd: new URL(`file://${path.dirname(manifestLoc)}/`),
      })),
    );
    for (const {manifest, cwd} of foundPkgs) {
      if (manifest.name && manifest.version) {
        return {manifest, cwd};
      }
    }
    throw new Error(`Could not locate root package.json for "${spec}"`);
  }

  /** Find any npm package’s entrypoints (similar to esinstall’s logic, but moved here to migrate away from esinstall) */
  private async findEntryPoints(
    manifest: Manifest,
    {cwd}: {cwd: URL},
  ): Promise<Record<string, URL>> {
    const entryPoints: Record<string, URL> = {};

    // filter out certain files
    function skipFile(filePath: string): boolean {
      if (!ESBUILD_EXTENSIONS.has(path.extname(filePath))) return true;
      if (filePath.endsWith('.spec.js') || filePath.endsWith('.test.js')) return true;
      if (filePath.includes(`${path.sep}svelte-native${path.sep}`)) return true; // TODO: temp fix for svelte-hmr
      return false;
    }

    // handle value from exports map
    async function parseSubpath(k: string, v: string): Promise<Record<string, URL>> {
      const isGlob = v.includes('*');
      if (!isGlob) {
        return {[k]: new URL(v, cwd)};
      }
      const urls: Record<string, URL> = {};
      const [kPrefix, kSuffix] = k.split('*');
      const [vPrefix, vSuffix] = v.split('*');
      const files = await glob(v, {cwd: url.fileURLToPath(cwd), filesOnly: true});
      for (const f of files) {
        if (skipFile(f)) continue; // if esbuild can’t process this, skip
        let expandedKey = f.replace(vPrefix, kPrefix); // "*" must have prefix
        if (kSuffix && vSuffix) expandedKey = expandedKey.replace(vSuffix, kSuffix); // "*" may not have suffix; check first
        urls[expandedKey] = new URL(`./${f}`, cwd);
      }
      return urls;
    }

    // get correct target
    function findTarget(subpath: Record<string, string>, targets: string[]): string | undefined {
      for (const target of targets) {
        if (subpath[target]) return target;
      }
    }

    // scenario 1: export map
    if (manifest.exports) {
      // glob searching takes time, so parse every key in parallel
      // (order isn’t preserved, but that’s alright)
      await Promise.all(
        Object.entries(manifest.exports as Record<string, string | Record<string, string>>).map(
          async ([k, v]) => {
            // string
            if (typeof v === 'string') {
              for (const [sk, sv] of Object.entries(await parseSubpath(k, v))) {
                entryPoints[sk] = sv;
              }
              return;
            }
            // object
            let match: string | undefined = v.default; // default
            if (this.target === 'browser') match = findTarget(v, [...BROWSER_SUBPATHS]);
            if (this.target === 'node-esm') match = findTarget(v, [...NODE_ESM_SUBPATHS]);
            if (this.target === 'node-cjs') match = findTarget(v, [...NODE_CJS_SUBPATHS]);
            if (!match) return; // if subpath/target mismatch, silently fail (should we throw instead?)
            for (const [sk, sv] of Object.entries(await parseSubpath(k, v[match]))) {
              entryPoints[sk] = sv;
            }
          },
        ),
      );
    }

    // scenario 2: no export map: scan entire package
    else {
      // TODO: only scan main entry file for CJS
      const files = await glob('**/*', {cwd: url.fileURLToPath(cwd), filesOnly: true});
      for (const f of files) {
        if (skipFile(f)) continue; // if esbuild can’t process this, skip
        entryPoints[`./${f}`] = new URL(f, cwd);
      }
    }

    // lastly, add main entrypoint if missing
    if (!entryPoints['.']) {
      switch (this.target) {
        case 'node-cjs': {
          for (const k of ['main']) {
            if (typeof manifest[k] === 'string') entryPoints['.'] = new URL(manifest[k], cwd);
          }
          break;
        }
        case 'browser':
        default: {
          for (const k of [
            'browser',
            'browser:module',
            'module',
            'main:exnext',
            'jsnext:main',
            'main',
          ]) {
            if (typeof manifest[k] === 'string') entryPoints['.'] = new URL(manifest[k], cwd);
          }
          // "browser" may also be an object
          if (typeof manifest.browser === 'object') {
            for (const k of ['./', './index', './index.js']) {
              if (manifest.browser[k]) {
                entryPoints['.'] = new URL(manifest.browser[k], cwd);
                break;
              }
            }
          }
          break;
        }
      }
    }

    return !Object.keys(entryPoints).length ? {'.': new URL('./index.js', cwd)} : entryPoints;
  }

  /** Parse & resolve package imports */
  private async transformImports({
    filename,
    contents,
  }: {
    filename: URL;
    contents: string | Buffer;
  }): Promise<string | Buffer> {
    const ext = path.extname(filename.pathname);
    const isJS = ext === '.js' || ext === '.mjs' || ext === '.cjs';
    if (!isJS) return contents;

    let code = Buffer.isBuffer(contents) ? contents.toString('utf8') : contents;
    try {
      let imports = [...esModuleLexer.parse(code)[0]].filter(({n}) => this.parseSpec(`${n}`));
      // step 1: find any missing/hidden deps, and resolve
      await Promise.all(
        imports.map(async ({n}) => {
          const pkgInfo = this.parseSpec(n as string);
          if (pkgInfo && pkgInfo.name && !this.importMap.imports[n as string])
            await this.resolvePackageImport(n as string);
        }),
      );

      // step 2: transform the imports (which are already cached, so there’s no waiting here)
      while (imports.length) {
        const next = imports.find(({n}) => this.importMap.imports[`${n}`]);
        if (!next) break;
        const resolved = await this.resolvePackageImport(next.n);
        code = code.substring(0, next.s) + resolved + code.substring(next.e);
        imports = [...esModuleLexer.parse(code)[0]].filter(({n}) => this.importMap.imports[`${n}`]); // because we modified the file, we must re-scan
      }
      return code;
    } catch (err) {
      try {
        const imports = cjsModuleLexer.parse(code);
        console.log({cjs: imports}); // TODO: resolve this
        return code;
      } catch (err) {
        // give up
      }
    }

    return contents as any;
  }
}
