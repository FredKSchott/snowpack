import merge from 'deepmerge';
import * as esbuild from 'esbuild';
import {existsSync, promises as fs} from 'fs';
import glob from 'glob';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import {performance} from 'perf_hooks';
import rimraf from 'rimraf';
import url from 'url';
import {
  generateEnvModule,
  wrapHtmlResponse,
  wrapImportMeta,
  wrapImportProxy,
} from '../build/build-import-proxy';
import {buildFile, runPipelineOptimizeStep} from '../build/build-pipeline';
import {createImportResolver} from '../build/import-resolver';
import {removeLeadingSlash} from '../config';
import createLogger from '../logger';
import {stopEsbuild} from '../plugins/plugin-esbuild';
import {transformFileImports} from '../rewrite-imports';
import {CommandOptions, ImportMap, SnowpackConfig, SnowpackSourceFile} from '../types/snowpack';
import {cssSourceMappingURL, getEncodingType, jsSourceMappingURL, replaceExt} from '../util';
import {getInstallTargets, run as installRunner} from './install';

const logger = createLogger({name: 'snowpack'});

async function installOptimizedDependencies(
  scannedFiles: SnowpackSourceFile[],
  installDest: string,
  commandOptions: CommandOptions,
) {
  const installConfig = merge(commandOptions.config, {
    installOptions: {
      dest: installDest,
      env: {NODE_ENV: process.env.NODE_ENV || 'production'},
      treeshake: commandOptions.config.installOptions.treeshake ?? true,
    },
  });
  // 1. Scan imports from your final built JS files.
  const installTargets = await getInstallTargets(installConfig, scannedFiles);
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installRunner({
    ...commandOptions,
    installTargets,
    config: installConfig,
  });
  return installResult;
}

class BuildPipelineFile {
  output: Record<string, string> = {};
  allFilesToResolveImports: Record<string, SnowpackSourceFile> = {};
  allImportProxyFiles: string[] = [];

  constructor(
    readonly filepath: string,
    readonly outDir: string,
    readonly buildDirectoryLoc: string,
    readonly config: SnowpackConfig,
  ) {}

  async buildFile() {
    const srcExt = path.extname(this.filepath);
    const builtFileOutput = await buildFile(this.filepath, {
      plugins: this.config.plugins,
      isDev: false,
      isHmrEnabled: false,
      sourceMaps: this.config.buildOptions.sourceMaps,
      logLevel: 'info',
    });

    for (const [fileExt, buildResult] of Object.entries(builtFileOutput)) {
      let {code, map} = buildResult;
      if (!code) {
        continue;
      }

      const outFilename = replaceExt(path.basename(this.filepath), srcExt, fileExt);
      const outLoc = path.join(this.outDir, outFilename);
      const sourceMappingURL = outFilename + '.map';

      switch (fileExt) {
        case '.css': {
          if (map) code = cssSourceMappingURL(code, sourceMappingURL);
          break;
        }
        case '.js': {
          if (builtFileOutput['.css']) {
            // inject CSS if imported directly
            const cssFilename = outFilename.replace(/\.js$/i, '.css');
            code = `import './${cssFilename}';\n` + code;
          }

          code = wrapImportMeta({code, env: true, isDev: false, hmr: false, config: this.config});

          if (map) code = jsSourceMappingURL(code, sourceMappingURL);

          this.allFilesToResolveImports[outLoc] = {
            baseExt: fileExt,
            expandedExt: fileExt,
            contents: code,
            locOnDisk: this.filepath,
          };
          break;
        }
        case '.html': {
          code = wrapHtmlResponse({code, isDev: false, hmr: false, config: this.config});
          this.allFilesToResolveImports[outLoc] = {
            baseExt: fileExt,
            expandedExt: fileExt,
            contents: code,
            locOnDisk: this.filepath,
          };
          break;
        }
      }

      this.output[outLoc] = code;
      if (map) {
        this.output[path.join(this.outDir, sourceMappingURL)] = map;
      }
    }
  }

  async resolveImports(importMap: ImportMap) {
    for (const [outLoc, file] of Object.entries(this.allFilesToResolveImports)) {
      const resolveImportSpecifier = createImportResolver({
        fileLoc: file.locOnDisk!, // we’re confident these are reading from disk because we just read them
        dependencyImportMap: importMap,
        config: this.config,
      });
      const resolvedCode = await transformFileImports(file, (spec) => {
        // Try to resolve the specifier to a known URL in the project
        let resolvedImportUrl = resolveImportSpecifier(spec);
        if (!resolvedImportUrl || url.parse(resolvedImportUrl).protocol) {
          return spec;
        }
        const extName = path.extname(resolvedImportUrl);
        const isProxyImport = extName && extName !== '.js';
        if (isProxyImport) {
          resolvedImportUrl = resolvedImportUrl + '.proxy.js';
        }
        const isAbsoluteUrlPath = path.posix.isAbsolute(resolvedImportUrl);
        const resolvedImportPath = removeLeadingSlash(path.normalize(resolvedImportUrl));

        // We treat ".proxy.js" files special: we need to make sure that they exist on disk
        // in the final build, so we mark them to be written to disk at the next step.
        if (isProxyImport) {
          if (isAbsoluteUrlPath) {
            this.allImportProxyFiles.push(path.resolve(this.buildDirectoryLoc, resolvedImportPath));
          } else {
            this.allImportProxyFiles.push(path.resolve(path.dirname(outLoc), resolvedImportPath));
          }
        }
        // When dealing with an absolute import path, we need to honor the baseUrl
        if (isAbsoluteUrlPath) {
          resolvedImportUrl = path
            .relative(
              path.dirname(outLoc),
              path.resolve(this.buildDirectoryLoc, resolvedImportPath),
            )
            .replace(/\\/g, '/'); // replace Windows backslashes at the end, after resolution
        }
        // Make sure that a relative URL always starts with "./"
        if (!resolvedImportUrl.startsWith('.') && !resolvedImportUrl.startsWith('/')) {
          resolvedImportUrl = './' + resolvedImportUrl;
        }
        return resolvedImportUrl;
      });
      this.output[outLoc] = resolvedCode;
    }
  }

  async writeToDisk() {
    mkdirp.sync(this.outDir);
    for (const [outLoc, code] of Object.entries(this.output)) {
      console.log('writeToDisk', outLoc);
      await fs.writeFile(outLoc, code, getEncodingType(path.extname(outLoc)));
    }
  }

  async buildProxy() {
    for (const importProxyFileLoc of this.allImportProxyFiles) {
      if (existsSync(importProxyFileLoc)) {
        // ignore
        continue;
      }
      const originalFileLoc = importProxyFileLoc.replace('.proxy.js', '');
      const proxiedExt = path.extname(originalFileLoc);
      const proxiedCode = await fs.readFile(originalFileLoc, getEncodingType(proxiedExt));
      const proxiedUrl = originalFileLoc.substr(this.buildDirectoryLoc.length).replace(/\\/g, '/');
      const proxyCode = await wrapImportProxy({
        url: proxiedUrl,
        code: proxiedCode,
        isDev: false,
        hmr: false,
        config: this.config,
      });
      await fs.writeFile(importProxyFileLoc, proxyCode, getEncodingType('.js'));
      console.log('buildProxy', importProxyFileLoc);
    }
  }

  async buildProxyMyself() {
    for (const [originalFileLoc, proxiedCode] of Object.entries(this.output)) {
      const importProxyFileLoc = originalFileLoc + '.proxy.js';
      if (!existsSync(importProxyFileLoc)) {
        // ignore
        continue;
      }
      const proxiedUrl = originalFileLoc.substr(this.buildDirectoryLoc.length).replace(/\\/g, '/');
      const proxyCode = await wrapImportProxy({
        url: proxiedUrl,
        code: proxiedCode,
        isDev: false,
        hmr: false,
        config: this.config,
      });
      await fs.writeFile(importProxyFileLoc, proxyCode, getEncodingType('.js'));
      console.log('buildProxyMyself', importProxyFileLoc);
    }
  }
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config, logLevel = 'info'} = commandOptions;

  logger.level = logLevel;

  const buildDirectoryLoc = config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);
  const mountedDirectories: [string, string][] = Object.entries(config.mount).map(
    ([fromDisk, toUrl]) => {
      return [
        path.resolve(cwd, fromDisk),
        path.resolve(buildDirectoryLoc, removeLeadingSlash(toUrl)),
      ];
    },
  );

  if (config.buildOptions.clean) {
    rimraf.sync(buildDirectoryLoc);
  }
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      await runPlugin
        .run({
          isDev: false,
          isHmrEnabled: false,
          // @ts-ignore: internal API only
          log: (msg, data: {msg: string} = {}) => {
            if (msg === 'WORKER_MSG') {
              logger.info(`[${runPlugin.name}] ${data.msg.trim()}`);
            }
          },
        })
        .catch((err) => {
          logger.error(`[${runPlugin.name}] ${err}`);
        });
    }
  }

  // Write the `import.meta.env` contents file to disk
  await fs.writeFile(path.join(internalFilesBuildLoc, 'env.js'), generateEnvModule('production'));

  logger.info(colors.yellow('! building source…'));
  const buildStart = performance.now();

  const buildPipelineFiles: BuildPipelineFile[] = [];
  for (const [fromDisk, dirDest] of mountedDirectories) {
    const allFiles = glob.sync(`**/*`, {
      ignore: config.exclude,
      cwd: fromDisk,
      absolute: true,
      nodir: true,
      dot: true,
    });
    for (const rawLocOnDisk of allFiles) {
      const locOnDisk = path.resolve(rawLocOnDisk); // this is necessary since glob.sync() returns paths with / on windows.  path.resolve() will switch them to the native path separator.
      const finalDest = locOnDisk.replace(fromDisk, dirDest);
      const outDir = path.dirname(finalDest);
      const buildPipelineFile = new BuildPipelineFile(locOnDisk, outDir, buildDirectoryLoc, config);
      buildPipelineFiles.push(buildPipelineFile);
      await buildPipelineFile.buildFile();
    }
  }

  const buildEnd = performance.now();
  logger.info(
    `${colors.green('✔')} build complete ${colors.dim(
      `[${((buildEnd - buildStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  // install
  const scannedFiles = buildPipelineFiles
    .map((f) => Object.values(f.allFilesToResolveImports))
    .filter(Boolean)
    .flat();
  const installDest = path.join(buildDirectoryLoc, config.buildOptions.webModulesUrl);
  const installResult = await installOptimizedDependencies(scannedFiles, installDest, {
    ...commandOptions,
    logLevel: 'error',
  });
  if (!installResult.success || installResult.hasError || !installResult.importMap) {
    process.exit(1);
  }

  for (const buildPipelineFile of buildPipelineFiles) {
    await buildPipelineFile.resolveImports(installResult.importMap);
    await buildPipelineFile.writeToDisk();
  }
  for (const buildPipelineFile of buildPipelineFiles) {
    await buildPipelineFile.buildProxy();
  }

  if (!config.buildOptions.watch) {
    stopEsbuild();
    await runPipelineOptimizeStep(buildDirectoryLoc, {
      plugins: config.plugins,
      isDev: false,
      isHmrEnabled: false,
      sourceMaps: config.buildOptions.sourceMaps,
    });

    // minify
    if (config.buildOptions.minify) {
      const minifierStart = performance.now();
      logger.info(colors.yellow('! minifying javascript...'));
      const minifierService = await esbuild.startService();
      const allJsFiles = glob.sync(path.join(buildDirectoryLoc, '**/*.js'), {
        ignore: [`**/${config.buildOptions.metaDir}/**/*`], // don’t minify meta dir
      });
      await Promise.all(
        allJsFiles.map(async (jsFile) => {
          const jsFileContents = await fs.readFile(jsFile, 'utf-8');
          const {js} = await minifierService.transform(jsFileContents, {minify: true});
          return fs.writeFile(jsFile, js, 'utf-8');
        }),
      );
      const minifierEnd = performance.now();
      logger.info(
        `${colors.green('✔')} minification complete ${colors.dim(
          `[${((minifierEnd - minifierStart) / 1000).toFixed(2)}s]`,
        )}`,
      );
      minifierService.stop();
    }

    logger.info(`${colors.underline(colors.green(colors.bold('▶ Build Complete!')))}\n\n`);
    return;
  }

  // Start watching the file system.
  // Defer "chokidar" loading to here, to reduce impact on overall startup time
  const chokidar = await import('chokidar');

  // Watch src files
  async function onWatchEvent(fileLoc: string) {
    const [fromDisk, dirDest] =
      mountedDirectories.find(([fromDisk]) => fileLoc.startsWith(fromDisk)) || [];
    if (!fromDisk || !dirDest) {
      return;
    }
    const finalDest = fileLoc.replace(fromDisk, dirDest);
    const outDir = path.dirname(finalDest);
    const changedPipelineFile = new BuildPipelineFile(fileLoc, outDir, buildDirectoryLoc, config);
    await changedPipelineFile.buildFile();
    await changedPipelineFile.resolveImports(installResult.importMap!);
    await changedPipelineFile.writeToDisk();
    await changedPipelineFile.buildProxy();
    await changedPipelineFile.buildProxyMyself();
  }
  const watcher = chokidar.watch(
    mountedDirectories.map(([dirDisk]) => dirDisk),
    {
      ignored: config.exclude,
      ignoreInitial: true,
      persistent: true,
      disableGlobbing: false,
    },
  );
  watcher.on('add', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('change', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('unlink', (fileLoc) => onWatchEvent(fileLoc));

  return new Promise(() => {});
}
