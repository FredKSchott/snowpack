import merge from 'deepmerge';
import {startService as esbuildStartService} from 'esbuild';
import {EventEmitter} from 'events';
import {promises as fs} from 'fs';
import glob from 'glob';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';
import {SnowpackSourceFile, removeLeadingSlash} from '../config';
import {stopEsbuild} from '../plugins/plugin-esbuild';
import {transformFileImports} from '../rewrite-imports';
import {printStats} from '../stats-formatter';
import {CommandOptions, getEncodingType, getExt, replaceExt, sanitizePackageName} from '../util';
import {
  buildFile,
  generateEnvModule,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapHtmlResponse,
  wrapImportMeta,
} from './build-util';
import {createImportResolver} from './import-resolver';
import {getInstallTargets, run as installRunner} from './install';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';

async function installOptimizedDependencies(
  allFilesToResolveImports: Record<string, SnowpackSourceFile>,
  installDest: string,
  commandOptions: CommandOptions,
) {
  console.log(colors.yellow('! optimizing dependencies...'));
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
  // 3. Print stats immediate after install output.
  if (installResult.stats) {
    console.log(printStats(installResult.stats));
  }
  return installResult;
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  const messageBus = new EventEmitter();

  const isBundledHardcoded = config.devOptions.bundle !== undefined;
  const bundlerPlugin = config._bundler;
  const isBundled = isBundledHardcoded ? !!config.devOptions.bundle : !!bundlerPlugin;
  const bundlerDashboardId = bundlerPlugin ? bundlerPlugin.name : 'bundle';
  const buildDirectoryLoc = isBundled ? path.join(cwd, `.build`) : config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);
  const finalDirectoryLoc = config.devOptions.out;

  if (config.buildOptions.clean) rimraf.sync(buildDirectoryLoc);
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);
  if (finalDirectoryLoc !== buildDirectoryLoc) {
    if (config.buildOptions.clean) rimraf.sync(finalDirectoryLoc);
    mkdirp.sync(finalDirectoryLoc);
  }

  console.log = (...args) => {
    messageBus.emit('CONSOLE', {level: 'log', args});
  };
  console.warn = (...args) => {
    messageBus.emit('CONSOLE', {level: 'warn', args});
  };
  console.error = (...args) => {
    messageBus.emit('CONSOLE', {level: 'error', args});
  };
  let relDest = path.relative(cwd, config.devOptions.out);
  if (!relDest.startsWith(`..${path.sep}`)) {
    relDest = `.${path.sep}` + relDest;
  }
  paint(
    messageBus,
    config.plugins.map((p) => p.name),
    {dest: relDest},
    undefined,
  );

  if (!isBundled) {
    messageBus.emit('WORKER_UPDATE', {
      id: bundlerDashboardId,
      state: ['SKIP', 'dim'],
    });
  }

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      messageBus.emit('WORKER_START', {id: runPlugin.name});
      runPlugin
        .run({
          isDev: false,
          log: (msg, data) => {
            messageBus.emit(msg, {...data, id: runPlugin.name});
          },
        })
        .then(() => {
          messageBus.emit('WORKER_COMPLETE', {id: runPlugin.name, error: null});
        })
        .catch((err) => {
          messageBus.emit('WORKER_COMPLETE', {id: runPlugin.name, error: err});
        });
    }
  }

  let minifierService = await esbuildStartService(); // create esbuild process for minifying (there may or may not be one in plugins)

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

  for (const [dirDisk, dirDest, allFiles] of includeFileSets) {
    for (const locOnDisk of allFiles) {
      const {baseExt: fileExt} = getExt(locOnDisk);
      let outLoc = locOnDisk.replace(dirDisk, dirDest);
      let builtLocOnDisk = locOnDisk;
      const extToReplace = config._extensionMap[fileExt] || srcFileExtensionMapping[fileExt];
      if (extToReplace) {
        outLoc = replaceExt(outLoc, extToReplace);
        builtLocOnDisk = replaceExt(builtLocOnDisk, extToReplace);
      }
      const builtFileOutput = await buildFile(locOnDisk, {
        buildPipeline: config.plugins,
        messageBus,
        isDev: false,
      });
      allBuiltFromFiles.add(locOnDisk);
      const {baseExt, expandedExt} = getExt(outLoc);
      let contents =
        builtFileOutput[
          config._extensionMap[fileExt] || srcFileExtensionMapping[fileExt] || fileExt
        ];
      if (!contents) {
        continue;
      }
      const cssOutPath = outLoc.replace(/.js$/, '.css');
      mkdirp.sync(path.dirname(outLoc));
      switch (baseExt) {
        case '.js': {
          if (builtFileOutput['.css']) {
            await fs.mkdir(path.dirname(cssOutPath), {recursive: true});
            await fs.writeFile(cssOutPath, builtFileOutput['.css'], 'utf-8');
            contents = `import './${path.basename(cssOutPath)}';\n` + contents;
          }
          contents = wrapImportMeta({code: contents, env: true, isDev: false, hmr: false, config});

          // minify install if enabled and there’s no bundler
          if (config.buildOptions.minify && !config._bundler) {
            const {js} = await minifierService.transform(contents, {minify: true});
            if (js) contents = js;
          }

          allFilesToResolveImports[outLoc] = {baseExt, expandedExt, contents, locOnDisk};
          break;
        }
        case '.html': {
          contents = wrapHtmlResponse({
            code: contents,
            isDev: false,

            hmr: false,
            config,
          });
          allFilesToResolveImports[outLoc] = {baseExt, expandedExt, contents, locOnDisk};
          break;
        }
      }
      await fs.writeFile(outLoc, contents, getEncodingType(baseExt));
    }
  }
  stopEsbuild();
  minifierService.stop();

  const installDest = path.join(buildDirectoryLoc, config.buildOptions.webModulesUrl);
  const installResult = await installOptimizedDependencies(
    allFilesToResolveImports,
    installDest,
    commandOptions,
  );
  if (!installResult.success || installResult.hasError) {
    process.exit(1);
  }

  const allProxiedFiles = new Set<string>();
  for (const [outLoc, file] of Object.entries(allFilesToResolveImports)) {
    const resolveImportSpecifier = createImportResolver({
      fileLoc: file.locOnDisk!, // we’re confident these are reading from disk because we just read them
      dependencyImportMap: installResult.importMap,
      isDev: false,
      isBundled,
      config,
    });
    const resolvedCode = await transformFileImports(file, (spec) => {
      // Try to resolve the specifier to a known URL in the project
      const resolvedImportUrl = resolveImportSpecifier(spec);
      if (resolvedImportUrl) {
        // We treat ".proxy.js" files special: we need to make sure that they exist on disk
        // in the final build, so we mark them to be written to disk at the next step.
        if (resolvedImportUrl.endsWith('.proxy.js')) {
          // handle proxied files from web_modules
          const isWebModule = removeLeadingSlash(resolvedImportUrl).startsWith(
            removeLeadingSlash(config.buildOptions.webModulesUrl),
          );
          if (isWebModule) {
            allProxiedFiles.add(
              path.resolve(
                cwd,
                config.devOptions.out,
                removeLeadingSlash(config.buildOptions.webModulesUrl),
                sanitizePackageName(spec),
              ),
            );
          } else {
            // handle local proxied files
            allProxiedFiles.add(
              resolvedImportUrl.startsWith('/')
                ? path.resolve(cwd, spec)
                : path.resolve(path.dirname(outLoc), spec),
            );
          }
        }
        return resolvedImportUrl;
      }
      return spec;
    });
    await fs.mkdir(path.dirname(outLoc), {recursive: true});
    await fs.writeFile(outLoc, resolvedCode);
  }

  for (const proxiedFileLoc of allProxiedFiles) {
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedCode = await fs.readFile(proxiedFileLoc, getEncodingType(proxiedExt));
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length).replace(/\\/g, '/');
    const proxyCode = proxiedFileLoc.endsWith('.module.css')
      ? await wrapCssModuleResponse({
          url: proxiedUrl,
          code: proxiedCode,
          ext: proxiedExt,
          isDev: false,
          hmr: false,
          config,
        })
      : wrapEsmProxyResponse({
          url: proxiedUrl,
          code: proxiedCode,
          ext: proxiedExt,
          isDev: false,
          hmr: false,
          config,
        });
    const proxyFileLoc = proxiedFileLoc + '.proxy.js';
    await fs.writeFile(proxyFileLoc, proxyCode, getEncodingType('.js'));
  }

  if (!isBundled) {
    messageBus.emit('WORKER_COMPLETE', {id: bundlerDashboardId, error: null});
    messageBus.emit('WORKER_UPDATE', {
      id: bundlerDashboardId,
      state: ['SKIP', isBundledHardcoded ? 'dim' : 'yellow'],
    });
    if (!isBundledHardcoded) {
      messageBus.emit('WORKER_MSG', {
        id: bundlerDashboardId,
        level: 'log',
        msg:
          `"plugins": ["@snowpack/plugin-webpack"]\n\n` +
          `Connect a bundler plugin to optimize your build for production.\n` +
          colors.dim(`Set "devOptions.bundle" configuration to false to remove this message.`),
      });
    }
  } else if (!bundlerPlugin) {
    messageBus.emit('WORKER_COMPLETE', {
      id: bundlerDashboardId,
      error: new Error('No bundler plugin connected.'),
    });
  } else {
    try {
      messageBus.emit('WORKER_UPDATE', {id: bundlerDashboardId, state: ['RUNNING', 'yellow']});
      await bundlerPlugin.bundle!({
        srcDirectory: buildDirectoryLoc,
        destDirectory: finalDirectoryLoc,
        jsFilePaths: allBuiltFromFiles,
        log: (msg) => {
          messageBus.emit('WORKER_MSG', {id: bundlerDashboardId, level: 'log', msg});
        },
      });
      messageBus.emit('WORKER_COMPLETE', {id: bundlerDashboardId, error: null});
    } catch (err) {
      messageBus.emit('WORKER_MSG', {
        id: bundlerDashboardId,
        level: 'error',
        msg: err.toString(),
      });
      messageBus.emit('WORKER_COMPLETE', {id: bundlerDashboardId, error: err});
    }
  }

  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
  }
}
