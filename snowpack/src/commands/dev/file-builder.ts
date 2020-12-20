
import url from 'url';
import path from 'path';
import {
  wrapHtmlResponse,
  wrapImportMeta,
  wrapImportProxy,
} from '../../build/build-import-proxy';

import { createImportResolver } from '../../build/import-resolver';

import * as colors from 'kleur/colors';

import { paintEvent } from '../paint';

import { buildFile as _buildFile } from '../../build/build-pipeline';

import { logger } from '../../logger';

import { EventEmitter } from 'events';

import {
  scanCodeImportsExports,
  transformEsmImports,
  transformFileImports,
} from '../../rewrite-imports';
import { matchDynamicImportValue } from '../../scan-imports';


import {
  cssSourceMappingURL,
  hasExtension,
  isRemoteUrl,
  jsSourceMappingURL,
  relativeURL,
  removeExtension,
} from '../../util';

import type { PackageSource, SnowpackBuildMap, SnowpackConfig } from "../../types";
import { EsmHmrEngine } from '../../hmr-server-engine';
import { SourceImportMap } from './source-import-map';

export type LoaderBuilderContext = {
  readonly config: SnowpackConfig,
  readonly hmrEngine: EsmHmrEngine,
  readonly inMemoryBuildCache: Map<string, SnowpackBuildMap>,
  readonly getCacheKey: (fileLoc: string, { isSSR, env }) => string,
  readonly messageBus: EventEmitter,
  readonly pkgSource: PackageSource,
};

export class FileBuilder {

  private readonly filesBeingBuilt = new Map<string, Promise<SnowpackBuildMap>>();
  private readonly reqUrlHmrParam: string | false;
  // public readonly sourceImportMapPromise: Promise<ImportMap>;

  constructor(
    private readonly loaderBuilderContext: LoaderBuilderContext,
    private readonly builderContext: {
      readonly isSSR: boolean,
      readonly isHMR: boolean,
      readonly isRoute: boolean,
      readonly reqUrl: string,
      readonly isProxyModule: boolean,
      readonly reqPath: string,
      readonly originalReqPath: string,
      readonly requestedFile: path.ParsedPath,
    },
    public responseFileExt: string,
    private readonly sourceImportMap: SourceImportMap,
    private readonly port: number,
  ) {
    const { reqUrl } = this.builderContext;
    this.reqUrlHmrParam = reqUrl.includes('?mtime=') && reqUrl.split('?')[1];

    // const {
    //   pkgSource,
    //   // commandOptions,
    // } = this.loaderBuilderContext;

    // this.sourceImportMapPromise = pkgSource.prepare(commandOptions);
  }

  /**
   * Given a file, build it. Building a file sends it through our internal
   * file builder pipeline, and outputs a build map representing the final
   * build. A Build Map is used because one source file can result in multiple
   * built files (Example: .svelte -> .js & .css).
   */
  public async buildFile(fileLoc: string): Promise<SnowpackBuildMap> {
    const { filesBeingBuilt } = this;
    const {
      config,
      inMemoryBuildCache,
      getCacheKey,
      messageBus,
    } = this.loaderBuilderContext;
    const {
      isSSR,
      isHMR,
    } = this.builderContext;

    const existingBuilderPromise = filesBeingBuilt.get(fileLoc);
    if (existingBuilderPromise) {
      return existingBuilderPromise;
    }
    const fileBuilderPromise = (async () => {
      const builtFileOutput = await _buildFile(url.pathToFileURL(fileLoc), {
        config,
        isDev: true,
        isSSR,
        isHmrEnabled: isHMR,
      });
      inMemoryBuildCache.set(
        getCacheKey(fileLoc, { isSSR, env: process.env.NODE_ENV }),
        builtFileOutput,
      );
      return builtFileOutput;
    })();
    filesBeingBuilt.set(fileLoc, fileBuilderPromise);
    try {
      messageBus.emit(paintEvent.BUILD_FILE, { id: fileLoc, isBuilding: true });
      return await fileBuilderPromise;
    } finally {
      filesBeingBuilt.delete(fileLoc);
      messageBus.emit(paintEvent.BUILD_FILE, { id: fileLoc, isBuilding: false });
    }
  }

  /**
   * Wrap Response: The same build result can be expressed in different ways
   * based on the URL. For example, "App.css" should return CSS but
   * "App.css.proxy.js" should return a JS representation of that CSS. This is
   * handled in the wrap step.
   */
  private async wrapResponse(
    code: string | Buffer,
    {
      sourceMap,
      sourceMappingURL,
    }: {
      sourceMap?: string;
      sourceMappingURL: string;
    },
  ) {
    const {
      hmrEngine,
      config,
    } = this.loaderBuilderContext;
    const {
      isHMR,
      isRoute,
    } = this.builderContext;
    let {
      isProxyModule,
      reqPath,
    } = this.builderContext;

    let isSourceMap = false;
    if (hasExtension(reqPath, '.proxy.js')) {
      isProxyModule = true;
      reqPath = removeExtension(reqPath, '.proxy.js');
    } else if (hasExtension(reqPath, '.map')) {
      isSourceMap = true;
      reqPath = removeExtension(reqPath, '.map');
    }

    // transform special requests
    if (isRoute) {
      code = wrapHtmlResponse({
        code: code as string,
        hmr: isHMR,
        hmrPort: hmrEngine.port !== this.port ? hmrEngine.port : undefined,
        isDev: true,
        config,
        mode: 'development',
      });
    } else if (isProxyModule) {
      this.responseFileExt = '.js';
    } else if (isSourceMap && sourceMap) {
      this.responseFileExt = '.map';
      code = sourceMap;
    }

    // transform other files
    switch (this.responseFileExt) {
      case '.css': {
        if (sourceMap) code = cssSourceMappingURL(code as string, sourceMappingURL);
        break;
      }
      case '.js': {
        if (isProxyModule) {
          code = await wrapImportProxy({ url: reqPath, code, hmr: isHMR, config });
        } else {
          code = wrapImportMeta({ code: code as string, env: true, hmr: isHMR, config });
        }

        // source mapping
        if (sourceMap) code = jsSourceMappingURL(code, sourceMappingURL);

        break;
      }
    }

    // by default, return file from disk
    return code;
  }

  /**
   * Resolve Imports: Resolved imports are based on the state of the file
   * system, so they can't be cached long-term with the build.
   */
  private async resolveResponseImports(
    fileLoc: string,
    responseExt: string,
    wrappedResponse: string,
    retryMissing = true,
  ): Promise<string> {
    const {
      config,
      pkgSource,
      hmrEngine,
    } = this.loaderBuilderContext;
    const {
      reqPath,
      isProxyModule,
      originalReqPath,
    } = this.builderContext;

    let missingPackages: string[] = [];
    const resolveImportSpecifier = createImportResolver({
      fileLoc,
      config,
    });
    const importMap = await this.sourceImportMap.getImportMap();
    wrappedResponse = await transformFileImports(
      {
        locOnDisk: fileLoc,
        contents: wrappedResponse,
        root: config.root,
        baseExt: responseExt,
      },
      (spec) =>  {
        // Try to resolve the specifier to a known URL in the project
        let resolvedImportUrl = resolveImportSpecifier(spec);
        // Handle a package import
        if (!resolvedImportUrl) {
          resolvedImportUrl = pkgSource.resolvePackageImport(spec, importMap, config);
        }
        // Handle a package import that couldn't be resolved
        if (!resolvedImportUrl) {
          missingPackages.push(spec);
          return spec;
        }
        // Ignore "http://*" imports
        if (isRemoteUrl(resolvedImportUrl)) {
          return resolvedImportUrl;
        }
        // Ignore packages marked as external
        if (config.installOptions.externalPackage?.includes(resolvedImportUrl)) {
          return spec;
        }
        // Handle normal "./" & "../" import specifiers
        const importExtName = path.posix.extname(resolvedImportUrl);
        const isProxyImport = importExtName && importExtName !== '.js';
        const isAbsoluteUrlPath = path.posix.isAbsolute(resolvedImportUrl);
        if (isProxyImport) {
          resolvedImportUrl = resolvedImportUrl + '.proxy.js';
        }

        // When dealing with an absolute import path, we need to honor the baseUrl
        // proxy modules may attach code to the root HTML (like style) so don't resolve
        if (isAbsoluteUrlPath && !isProxyModule) {
          resolvedImportUrl = relativeURL(path.posix.dirname(reqPath), resolvedImportUrl);
        }
        // Make sure that a relative URL always starts with "./"
        if (!resolvedImportUrl.startsWith('.') && !resolvedImportUrl.startsWith('/')) {
          resolvedImportUrl = './' + resolvedImportUrl;
        }
        return resolvedImportUrl;
      },
    );

    // A missing package is a broken import, so we need to recover instantly if possible.
    if (missingPackages.length > 0) {
      // if retryMissing is true, do a fresh dependency install and then retry.
      // Only retry once, to prevent an infinite loop when a package doesn't actually exist.
      if (retryMissing) {
        try {
          this.sourceImportMap.recoverMissingPackageImport(missingPackages);
          return this.resolveResponseImports(fileLoc, responseExt, wrappedResponse, false);
        } catch (err) {
          const errorTitle = `Dependency Install Error`;
          const errorMessage = err.message;
          logger.error(`${errorTitle}: ${errorMessage}`);
          hmrEngine.broadcastMessage({
            type: 'error',
            title: errorTitle,
            errorMessage,
            fileLoc,
          });
          return wrappedResponse;
        }
      }
      // Otherwise, we need to send an error to the user, telling them about this issue.
      // A failed retry usually means that Snowpack couldn't detect the import that the browser
      // eventually saw post-build. In that case, you need to add it manually.
      const errorTitle = `Error: Import "${missingPackages[0]}" could not be resolved.`;
      const errorMessage = `If this import doesn't exist in the source file, add ${colors.bold(
        `"install": ["${missingPackages[0]}"]`,
      )} to your Snowpack config file.`;
      logger.error(`${errorTitle}\n${errorMessage}`);
      hmrEngine.broadcastMessage({
        type: 'error',
        title: errorTitle,
        errorMessage,
        fileLoc,
      });
    }

    let code = wrappedResponse;
    const { reqUrlHmrParam } = this;
    if (this.responseFileExt === '.js' && reqUrlHmrParam)
      code = await transformEsmImports(code as string, (imp) => {
        const importUrl = path.posix.resolve(path.posix.dirname(reqPath), imp);
        const node = hmrEngine.getEntry(importUrl);
        if (node && node.needsReplacement) {
          hmrEngine.markEntryForReplacement(node, false);
          return `${imp}?${reqUrlHmrParam}`;
        }
        return imp;
      });

    if (this.responseFileExt === '.js') {
      const isHmrEnabled = code.includes('import.meta.hot');
      const rawImports = await scanCodeImportsExports(code);
      const resolvedImports = rawImports.map((imp) => {
        let spec = code.substring(imp.s, imp.e);
        if (imp.d > -1) {
          spec = matchDynamicImportValue(spec) || '';
        }
        spec = spec.replace(/\?mtime=[0-9]+$/, '');
        return path.posix.resolve(path.posix.dirname(reqPath), spec);
      });
      hmrEngine.setEntry(originalReqPath, resolvedImports, isHmrEnabled);
    }

    wrappedResponse = code;
    return wrappedResponse;
  }

  /**
   * Given a build, finalize it for the response. This involves running
   * individual steps needed to go from build result to sever response,
   * including:
   *   - wrapResponse(): Wrap responses
   *   - resolveResponseImports(): Resolve all ESM imports
   */
  public async finalizeResponse(
    fileLoc: string,
    requestedFileExt: string,
    output: SnowpackBuildMap,
  ): Promise<string | Buffer | null> {
    const {
      reqPath,
      requestedFile,
    } = this.builderContext;
    // Verify that the requested file exists in the build output map.
    if (!output[requestedFileExt] || !Object.keys(output)) {
      return null;
    }
    const { code, map } = output[requestedFileExt];
    let finalResponse = code;
    // Handle attached CSS.
    if (requestedFileExt === '.js' && output['.css']) {
      finalResponse =
        `import './${path.basename(reqPath).replace(/.js$/, '.css.proxy.js')}';\n` +
        finalResponse;
    }
    // Resolve imports.
    if (
      requestedFileExt === '.js' ||
      requestedFileExt === '.html' ||
      requestedFileExt === '.css'
    ) {
      finalResponse = await this.resolveResponseImports(
        fileLoc,
        requestedFileExt,
        finalResponse as string,
      );
    }
    // Wrap the response.
    finalResponse = await this.wrapResponse(finalResponse, {
      sourceMap: map,
      sourceMappingURL: path.basename(requestedFile.base) + '.map',
    });
    // Return the finalized response.
    return finalResponse;
  }
}