import merge from 'deepmerge';
import * as esbuild from 'esbuild';
import {promises as fs} from 'fs';
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
import {CommandOptions, SnowpackSourceFile} from '../types/snowpack';
import {getEncodingType, replaceExt, jsSourceMappingURL, cssSourceMappingURL} from '../util';
import {getInstallTargets, run as installRunner} from './install';

const logger = createLogger({name: 'snowpack'});

async function installOptimizedDependencies(
  allFilesToResolveImports: Record<string, SnowpackSourceFile>,
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
  const installTargets = await getInstallTargets(
    installConfig,
    Object.values(allFilesToResolveImports),
  );
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installRunner({
    ...commandOptions,
    installTargets,
    config: installConfig,
  });
  return installResult;
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config, logLevel = 'info'} = commandOptions;

  logger.level = logLevel;

  const buildDirectoryLoc = config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);

  if (config.buildOptions.clean) {
    rimraf.sync(buildDirectoryLoc);
  }
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);

  let relDest = path.relative(cwd, config.devOptions.out);
  if (!relDest.startsWith(`..${path.sep}`)) {
    relDest = `.${path.sep}` + relDest;
  }

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      await runPlugin
        .run({
          isDev: false,
          isHmrEnabled: false,
          // @ts-ignore: internal API only
          log: (msg, data = {}) => {
            logger.info(`[${runPlugin.name}] ${msg}`);
          },
        })
        .catch((err) => {
          logger.error(`[${runPlugin.name}] ${err}`);
        });
    }
  }

  // Write the `import.meta.env` contents file to disk
  await fs.writeFile(path.join(internalFilesBuildLoc, 'env.js'), generateEnvModule('production'));

  const includeFileSets: [string, string, string[]][] = [];
  for (const [fromDisk, toUrl] of Object.entries(config.mount)) {
    const dirDisk = path.resolve(cwd, fromDisk);
    const dirDest = path.resolve(buildDirectoryLoc, removeLeadingSlash(toUrl));
    const allFiles = glob.sync(`**/*`, {
      ignore: config.exclude,
      cwd: dirDisk,
      absolute: true,
      nodir: true,
      dot: true,
    });
    const allBuildNeededFiles: string[] = [];
    await Promise.all(
      allFiles.map(async (f) => {
        f = path.resolve(f); // this is necessary since glob.sync() returns paths with / on windows.  path.resolve() will switch them to the native path separator.
        allBuildNeededFiles.push(f);
      }),
    );
    includeFileSets.push([dirDisk, dirDest, allBuildNeededFiles]);
  }

  const allBuiltFromFiles = new Set<string>();
  const allFilesToResolveImports: Record<string, SnowpackSourceFile> = {};

  logger.info(colors.yellow('! building source…'));
  const buildStart = performance.now();

  for (const [dirDisk, dirDest, allFiles] of includeFileSets) {
    for (const locOnDisk of allFiles) {
      const srcExt = path.extname(locOnDisk);
      const builtFileOutput = await buildFile(locOnDisk, {
        plugins: config.plugins,
        isDev: false,
        isHmrEnabled: false,
        sourceMaps: config.buildOptions.sourceMaps,
        logLevel,
      });
      allBuiltFromFiles.add(locOnDisk);

      for (const [fileExt, buildResult] of Object.entries(builtFileOutput)) {
        let {code, map} = buildResult;
        if (!code) {
          continue;
        }

        const outDir = path.dirname(locOnDisk.replace(dirDisk, dirDest));
        const outFilename = replaceExt(path.basename(locOnDisk), srcExt, fileExt);
        const outLoc = path.join(outDir, outFilename);
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

            code = wrapImportMeta({code, env: true, isDev: false, hmr: false, config});

            if (map) code = jsSourceMappingURL(code, sourceMappingURL);

            allFilesToResolveImports[outLoc] = {
              baseExt: fileExt,
              expandedExt: fileExt,
              contents: code,
              locOnDisk,
            };
            break;
          }
          case '.html': {
            code = wrapHtmlResponse({code, isDev: false, hmr: false, config});
            allFilesToResolveImports[outLoc] = {
              baseExt: fileExt,
              expandedExt: fileExt,
              contents: code,
              locOnDisk,
            };
            break;
          }
        }

        // make directory if doesn’t exist
        mkdirp.sync(outDir);

        // write source map
        if (map) await fs.writeFile(path.join(outDir, sourceMappingURL), map, 'utf-8');

        // write file
        await fs.writeFile(outLoc, code, getEncodingType(fileExt));
      }
    }
  }
  stopEsbuild();

  const buildEnd = performance.now();
  logger.info(
    `${colors.green('✔')} build complete ${colors.dim(
      `[${((buildEnd - buildStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  // install
  const installDest = path.join(buildDirectoryLoc, config.buildOptions.webModulesUrl);
  const installResult = await installOptimizedDependencies(allFilesToResolveImports, installDest, {
    ...commandOptions,
    logLevel: 'error',
  });
  if (!installResult.success || installResult.hasError) {
    process.exit(1);
  }

  const allImportProxyFiles = new Set<string>();
  for (const [outLoc, file] of Object.entries(allFilesToResolveImports)) {
    const resolveImportSpecifier = createImportResolver({
      fileLoc: file.locOnDisk!, // we’re confident these are reading from disk because we just read them
      dependencyImportMap: installResult.importMap,
      config,
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
          allImportProxyFiles.add(path.resolve(buildDirectoryLoc, resolvedImportPath));
        } else {
          allImportProxyFiles.add(path.resolve(path.dirname(outLoc), resolvedImportPath));
        }
      }
      // When dealing with an absolute import path, we need to honor the baseUrl
      if (isAbsoluteUrlPath) {
        resolvedImportUrl = path
          .relative(path.dirname(outLoc), path.resolve(buildDirectoryLoc, resolvedImportPath))
          .replace(/\\/g, '/'); // replace Windows backslashes at the end, after resolution
      }
      // Make sure that a relative URL always starts with "./"
      if (!resolvedImportUrl.startsWith('.') && !resolvedImportUrl.startsWith('/')) {
        resolvedImportUrl = './' + resolvedImportUrl;
      }
      return resolvedImportUrl;
    });
    await fs.mkdir(path.dirname(outLoc), {recursive: true});
    await fs.writeFile(outLoc, resolvedCode);
  }

  for (const importProxyFileLoc of allImportProxyFiles) {
    const originalFileLoc = importProxyFileLoc.replace('.proxy.js', '');
    const proxiedExt = path.extname(originalFileLoc);
    const proxiedCode = await fs.readFile(originalFileLoc, getEncodingType(proxiedExt));
    const proxiedUrl = originalFileLoc.substr(buildDirectoryLoc.length).replace(/\\/g, '/');
    const proxyCode = await wrapImportProxy({
      url: proxiedUrl,
      code: proxiedCode,
      isDev: false,
      hmr: false,
      config,
    });
    await fs.writeFile(importProxyFileLoc, proxyCode, getEncodingType('.js'));
  }

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
}
