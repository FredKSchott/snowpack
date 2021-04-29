import {InstallTarget} from 'esinstall';
import {promises as fs} from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import url from 'url';
import {EsmHmrEngine} from '../hmr-server-engine';
import {
  scanCodeImportsExports,
  transformEsmImports,
  transformFileImports,
} from '../rewrite-imports';
import {matchDynamicImportValue, scanImportsFromFiles} from '../scan-imports';
import {getPackageSource} from '../sources/util';
import {
  ImportMap,
  SnowpackBuildMap,
  SnowpackBuildResultFileManifest,
  SnowpackBuiltFile,
  SnowpackConfig,
} from '../types';
import {
  createInstallTarget,
  isRemoteUrl,
  relativeURL,
  removeLeadingSlash,
  replaceExtension,
} from '../util';
import {
  getMetaUrlPath,
  SRI_CLIENT_HMR_SNOWPACK,
  SRI_ERROR_HMR_SNOWPACK,
  transformGlobImports,
  wrapHtmlResponse,
  wrapImportMeta,
  wrapImportProxy,
} from './build-import-proxy';
import {buildFile} from './build-pipeline';
import {getUrlsForFile} from './file-urls';
import {createImportResolver, createImportGlobResolver} from './import-resolver';

/**
 * FileBuilder - This class is responsible for building a file. It is broken into
 * individual stages so that the entire application build process can be tackled
 * in stages (build -> resolve -> get response).
 */
export class FileBuilder {
  buildOutput: SnowpackBuildMap = {};
  resolvedOutput: SnowpackBuildMap = {};

  isDev: boolean;
  isHMR: boolean;
  isSSR: boolean;
  buildPromise: Promise<SnowpackBuildMap> | undefined;

  readonly loc: string;
  readonly urls: string[];
  readonly config: SnowpackConfig;
  hmrEngine: EsmHmrEngine | null = null;

  constructor({
    loc,
    isDev,
    isHMR,
    isSSR,
    config,
    hmrEngine,
  }: {
    loc: string;
    isDev: boolean;
    isHMR: boolean;
    isSSR: boolean;
    config: SnowpackConfig;
    hmrEngine?: EsmHmrEngine | null;
  }) {
    this.loc = loc;
    this.isDev = isDev;
    this.isHMR = isHMR;
    this.isSSR = isSSR;
    this.config = config;
    this.hmrEngine = hmrEngine || null;
    const urls = getUrlsForFile(loc, config);
    if (!urls) {
      throw new Error(`No mounted URLs configured for file: ${loc}`);
    }
    this.urls = urls;
  }

  private verifyRequestFromBuild(type: string): SnowpackBuiltFile | undefined {
    const possibleExtensions = this.urls.map((url) => path.extname(url));
    if (!possibleExtensions.includes(type))
      throw new Error(
        `${this.loc} - Requested content "${type}" but only built ${possibleExtensions.join(', ')}`,
      );
    return this.resolvedOutput[type];
  }

  /**
   * Resolve Imports: Resolved imports are based on the state of the file
   * system, so they can't be cached long-term with the build.
   */
  async resolveImports(
    isResolve: boolean,
    hmrParam?: string | false,
    importMap?: ImportMap,
  ): Promise<InstallTarget[]> {
    const urlPathDirectory = path.posix.dirname(this.urls[0]!);
    const pkgSource = getPackageSource(this.config);
    const resolvedImports: InstallTarget[] = [];
    for (const [type, outputResult] of Object.entries(this.buildOutput)) {
      if (!(type === '.js' || type === '.html' || type === '.css')) {
        continue;
      }
      let contents =
        typeof outputResult.code === 'string'
          ? outputResult.code
          : outputResult.code.toString('utf8');

      // Handle attached CSS.
      if (type === '.js' && this.buildOutput['.css']) {
        const relativeCssImport = `./${replaceExtension(
          path.posix.basename(this.urls[0]!),
          '.js',
          '.css',
        )}`;
        contents = `import '${relativeCssImport}';\n` + contents;
      }
      // Finalize the response
      contents = this.finalizeResult(type, contents);
      //
      const resolveImportGlobSpecifier = createImportGlobResolver({
        fileLoc: this.loc,
        config: this.config,
      });
      // resolve all imports
      const resolveImportSpecifier = createImportResolver({
        fileLoc: this.loc,
        config: this.config,
      });
      const resolveImport = async (spec) => {
        // Ignore packages marked as external
        if (this.config.packageOptions.external?.includes(spec)) {
          return spec;
        }
        if (isRemoteUrl(spec)) {
          return spec;
        }
        // Try to resolve the specifier to a known URL in the project
        let resolvedImportUrl = resolveImportSpecifier(spec);
        // Handle a package import
        if (!resolvedImportUrl) {
          try {
            return await pkgSource.resolvePackageImport(spec, {
              importMap: importMap || (isResolve ? undefined : {imports: {}}),
            });
          } catch (err) {
            if (!isResolve && /not included in import map./.test(err.message)) {
              return spec;
            }
            throw err;
          }
        }
        return resolvedImportUrl || spec;
      };

      const scannedImports = await scanImportsFromFiles(
        [
          {
            baseExt: type,
            root: this.config.root,
            locOnDisk: this.loc,
            contents,
          },
        ],
        this.config,
      );
      contents = await transformGlobImports({contents, resolveImportGlobSpecifier});
      contents = await transformFileImports({type, contents}, async (spec) => {
        let resolvedImportUrl = await resolveImport(spec);

        // Handle normal "./" & "../" import specifiers
        const importExtName = path.posix.extname(resolvedImportUrl);
        const isProxyImport = importExtName && importExtName !== '.js' && importExtName !== '.mjs';
        const isAbsoluteUrlPath = path.posix.isAbsolute(resolvedImportUrl);
        if (isAbsoluteUrlPath) {
          if (isResolve && this.config.buildOptions.resolveProxyImports && isProxyImport) {
            resolvedImportUrl = resolvedImportUrl + '.proxy.js';
          }
          resolvedImports.push(createInstallTarget(resolvedImportUrl));
        } else {
          resolvedImports.push(
            ...scannedImports
              .filter(({specifier}) => specifier === spec)
              .map((installTarget) => {
                installTarget.specifier = resolvedImportUrl;
                return installTarget;
              }),
          );
        }
        if (isAbsoluteUrlPath) {
          // When dealing with an absolute import path, we need to honor the baseUrl
          // proxy modules may attach code to the root HTML (like style) so don't resolve
          resolvedImportUrl = relativeURL(urlPathDirectory, resolvedImportUrl);
        }
        return resolvedImportUrl;
      });

      // This is a hack since we can't currently scan "script" `src=` tags as imports.
      // Either move these to inline JavaScript in the script body, or add support for
      // `script.src=` and `link.href` scanning & resolving in transformFileImports().
      if (type === '.html' && this.isHMR) {
        if (contents.includes(SRI_CLIENT_HMR_SNOWPACK)) {
          resolvedImports.push(createInstallTarget(getMetaUrlPath('hmr-client.js', this.config)));
        }
        if (contents.includes(SRI_ERROR_HMR_SNOWPACK)) {
          resolvedImports.push(
            createInstallTarget(getMetaUrlPath('hmr-error-overlay.js', this.config)),
          );
        }
      }

      if (type === '.js' && hmrParam) {
        contents = await transformEsmImports(contents as string, (imp) => {
          const importUrl = path.posix.resolve(urlPathDirectory, imp);
          const node = this.hmrEngine?.getEntry(importUrl);
          if (node && node.needsReplacement) {
            this.hmrEngine?.markEntryForReplacement(node, false);
            return `${imp}?${hmrParam}`;
          }
          return imp;
        });
      }

      if (type === '.js') {
        const isHmrEnabled = contents.includes('import.meta.hot');
        const rawImports = await scanCodeImportsExports(contents);
        const resolvedImports = rawImports.map((imp) => {
          let spec = contents.substring(imp.s, imp.e).replace(/(\/|\\)+$/, '');
          if (imp.d > -1) {
            spec = matchDynamicImportValue(spec) || '';
          }
          spec = spec.replace(/\?mtime=[0-9]+$/, '');
          return path.posix.resolve(urlPathDirectory, spec);
        });
        this.hmrEngine?.setEntry(this.urls[0], resolvedImports, isHmrEnabled);
      }
      // Update the output with the new resolved imports
      this.resolvedOutput[type].code = contents;
      this.resolvedOutput[type].map = undefined;
    }
    return resolvedImports;
  }

  /**
   * Given a file, build it. Building a file sends it through our internal
   * file builder pipeline, and outputs a build map representing the final
   * build. A Build Map is used because one source file can result in multiple
   * built files (Example: .svelte -> .js & .css).
   */
  async build(isStatic: boolean) {
    if (this.buildPromise) {
      return this.buildPromise;
    }
    const fileBuilderPromise = (async () => {
      if (isStatic) {
        return {
          [path.extname(this.loc)]: {
            code: await fs.readFile(this.loc),
            map: undefined,
          },
        };
      }
      const builtFileOutput = await buildFile(url.pathToFileURL(this.loc), {
        config: this.config,
        isDev: this.isDev,
        isSSR: this.isSSR,
        isPackage: false,
        isHmrEnabled: this.isHMR,
      });
      return builtFileOutput;
    })();
    this.buildPromise = fileBuilderPromise;
    try {
      this.resolvedOutput = {};
      this.buildOutput = await fileBuilderPromise;
      for (const [outputKey, {code, map}] of Object.entries(this.buildOutput)) {
        this.resolvedOutput[outputKey] = {code, map};
      }
    } finally {
      this.buildPromise = undefined;
    }
  }

  private finalizeResult(type: string, content: string): string {
    // Wrap the response.
    switch (type) {
      case '.html': {
        content = wrapHtmlResponse({
          code: content as string,
          hmr: this.isHMR,
          hmrPort: this.hmrEngine ? this.hmrEngine.port : undefined,
          isDev: this.isDev,
          config: this.config,
          mode: this.isDev ? 'development' : 'production',
        });
        break;
      }
      case '.css': {
        break;
      }
      case '.js':
        {
          content = wrapImportMeta({
            code: content as string,
            env: true,
            hmr: this.isHMR,
            config: this.config,
          });
        }
        break;
    }
    // Return the finalized response.
    return content;
  }

  getResult(type: string): string | Buffer | undefined {
    const result = this.verifyRequestFromBuild(type);
    if (result) {
      // TODO: return result.map
      return result.code;
    }
  }

  getSourceMap(type: string): string | undefined {
    return this.resolvedOutput[type].map;
  }

  async getProxy(_url: string, type: string) {
    const code = this.resolvedOutput[type].code;
    const url = this.isDev ? _url : this.config.buildOptions.baseUrl + removeLeadingSlash(_url);
    return await wrapImportProxy({url, code, hmr: this.isHMR, config: this.config});
  }

  async writeToDisk(dir: string, results: SnowpackBuildResultFileManifest) {
    await mkdirp(path.dirname(path.join(dir, this.urls[0])));
    for (const outUrl of this.urls) {
      const buildOutput = results[outUrl].contents;
      const encoding = typeof buildOutput === 'string' ? 'utf8' : undefined;
      await fs.writeFile(path.join(dir, outUrl), buildOutput, encoding);
    }
  }
}
