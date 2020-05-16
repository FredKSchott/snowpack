import chalk from 'chalk';
import { startService } from 'esbuild';
import { EventEmitter } from 'events';
import execa from 'execa';
import { promises as fs } from 'fs';
import glob from 'glob';
import mkdirp from 'mkdirp';
import npmRunPath from 'npm-run-path';
import path from 'path';
import rimraf from 'rimraf';
import { DevScript } from '../config';
import { transformEsmImports } from '../rewrite-imports';
import { CommandOptions, ImportMap } from '../util';
import { getFileBuilderForWorker, wrapCssModuleResponse, wrapEsmProxyResponse } from './build-util';
import { paint } from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';
const {copy} = require('fs-extra');

const IS_PREACT = /from\s+['"]preact['"]/;

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  process.env.NODE_ENV = 'production';

  const messageBus = new EventEmitter();
  const relevantWorkers: DevScript[] = [];
  const allBuildExtensions: string[] = [];

  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');
  let dependencyImportMap: ImportMap = {imports: {}};
  try {
    dependencyImportMap = require(dependencyImportMapLoc);
  } catch (err) {
    // no import-map found, safe to ignore
  }

  let isBundled = config.devOptions.bundle;
  const isBundledHardcoded = isBundled !== undefined;
  if (!isBundledHardcoded) {
    try {
      require.resolve('parcel-bundler', {paths: [cwd]});
      isBundled = true;
    } catch (err) {
      isBundled = false;
    }
  }

  const buildDirectoryLoc = isBundled ? path.join(cwd, `.build`) : config.devOptions.out;
  const finalDirectoryLoc = config.devOptions.out;

  if (config.scripts.length <= 1) {
    console.error(chalk.red(`No build scripts found, so nothing to build.`));
    console.error(`See https://www.snowpack.dev/#build-scripts for help getting started.`);
    return;
  }

  rimraf.sync(finalDirectoryLoc);
  mkdirp.sync(finalDirectoryLoc);
  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
    mkdirp.sync(buildDirectoryLoc);
  }

  // const extToWorkerMap: {[ext: string]: any[]} = {};
  for (const workerConfig of config.scripts) {
    const {type, match} = workerConfig;
    if (
      type === 'build' ||
      type === 'plugin' ||
      type === 'run' ||
      type === 'mount' ||
      type === 'proxy'
    ) {
      relevantWorkers.push(workerConfig);
    }
    if (type === 'build' || type === 'plugin') {
      allBuildExtensions.push(...match); // for (const ext of exts) {
      // extToWorkerMap[ext] = extToWorkerMap[ext] || [];
      // extToWorkerMap[ext].push([id, workerConfig]);
      // }
    }
  }

  relevantWorkers.push({id: 'bundle:*', type: 'bundle', match: ['*'], cmd: 'NA', watch: undefined});

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
  paint(messageBus, relevantWorkers, {dest: relDest}, undefined);

  for (const workerConfig of relevantWorkers) {
    const {id, type} = workerConfig;
    if (type !== 'proxy') {
      continue;
    }
    messageBus.emit('WORKER_UPDATE', {
      id,
      state: ['SKIP', 'dim'],
    });
  }

  if (!isBundled) {
    messageBus.emit('WORKER_UPDATE', {
      id: 'bundle:*',
      state: ['SKIP', 'dim'],
    });
  }

  const mountDirDetails: any[] = relevantWorkers
    .map((scriptConfig) => {
      const {id, type, args} = scriptConfig;
      if (type !== 'mount') {
        return false;
      }
      const dirDisk = path.resolve(cwd, args.fromDisk);
      const dirDest = path.resolve(buildDirectoryLoc, args.toUrl.replace(/^\//, ''));
      return [id, dirDisk, dirDest];
    })
    .filter(Boolean);

  const esbuildService = await startService();
  const includeFileSets: [string, string, string[]][] = [];
  const allProxiedFiles = new Set<string>();
  const allCssModules = new Set<string>();
  for (const [id, dirDisk, dirDest] of mountDirDetails) {
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    let allFiles;
    try {
      allFiles = glob.sync(`**/*`, {
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
          if (allBuildExtensions.includes(path.extname(f).substr(1))) {
            allBuildNeededFiles.push(f);
            return;
          }
          let outPath = f.replace(dirDisk, dirDest);
          mkdirp.sync(path.dirname(outPath));

          if (
            path.extname(f) !== '.jsx' &&
            path.extname(f) !== '.tsx' &&
            path.extname(f) !== '.ts' &&
            path.extname(f) !== '.js'
          ) {
            return fs.copyFile(f, outPath);
          }

          let code = await fs.readFile(f, {encoding: 'utf-8'});
          if (
            path.extname(f) === '.jsx' ||
            path.extname(f) === '.tsx' ||
            path.extname(f) === '.ts'
          ) {
            outPath = outPath.replace(path.extname(f), '.js');
            const isPreact = IS_PREACT.test(code);
            const {js} = await esbuildService!.transform(code, {
              loader: path.extname(f).substr(1) as 'jsx' | 'ts' | 'tsx',
              jsxFactory: isPreact ? 'h' : undefined,
              jsxFragment: isPreact ? 'Fragment' : undefined,
            });
            code = js!;
          }

          code = await transformEsmImports(code, (spec) => {
            if (spec.startsWith('http')) {
              return spec;
            }
            if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
              const ext = path.extname(spec).substr(1);
              if (!ext) {
                return spec + '.js';
              }
              const extToReplace = srcFileExtensionMapping[ext];
              if (extToReplace) {
                spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
              }
              if (spec.endsWith('.module.css')) {
                const resolvedUrl = path.resolve(path.dirname(outPath), spec);
                allCssModules.add(resolvedUrl);
                spec = spec.replace('.module.css', '.css.module.js');
              } else if (!isBundled && (extToReplace || ext) !== 'js') {
                const resolvedUrl = path.resolve(path.dirname(outPath), spec);
                allProxiedFiles.add(resolvedUrl);
                spec = spec + '.proxy.js';
              }
              return spec;
            }
            if (dependencyImportMap.imports[spec]) {
              return path.posix.resolve(`/web_modules`, dependencyImportMap.imports[spec]);
            }
            let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
            if (missingPackageName.startsWith('@')) {
              missingPackageName += '/' + deepPackagePathParts.shift();
            }
            messageBus.emit('MISSING_WEB_MODULE', {
              spec: spec,
              pkgName: missingPackageName,
            });
            return `/web_modules/${spec}.js`;
          });
          return fs.writeFile(outPath, code);
        }),
      );
      includeFileSets.push([dirDisk, dirDest, allBuildNeededFiles]);
      messageBus.emit('WORKER_COMPLETE', {id});
    } catch (err) {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    }
  }
  esbuildService.stop();

  for (const workerConfig of relevantWorkers) {
    const {id, type, match} = workerConfig;
    if (type !== 'run') {
      continue;
    }
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    const workerPromise = execa.command(workerConfig.cmd, {
      env: npmRunPath.env(),
      extendEnv: true,
      shell: true,
      cwd,
    });
    workerPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    });
    workerPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    });
    const {stdout, stderr} = workerPromise;
    stdout?.on('data', (b) => {
      let stdOutput = b.toString();
      if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
        messageBus.emit('WORKER_RESET', {id});
        stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
      }
      if (id.endsWith(':tsc')) {
        if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
          messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
        }
        if (/Watching for file changes./gm.test(stdOutput)) {
          messageBus.emit('WORKER_UPDATE', {id, state: 'WATCHING'});
        }
        const errorMatch = stdOutput.match(/Found (\d+) error/);
        if (errorMatch && errorMatch[1] !== '0') {
          messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
        }
      }
      messageBus.emit('WORKER_MSG', {id, level: 'log', msg: stdOutput});
    });
    stderr?.on('data', (b) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: b.toString()});
    });
    await workerPromise;
  }

  const allBuiltFromFiles = new Set();
  for (const workerConfig of relevantWorkers) {
    const {id, match, type} = workerConfig;
    if (type !== 'build' && type !== 'plugin') {
      continue;
    }

    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    for (const [dirDisk, dirDest, allFiles] of includeFileSets) {
      for (const f of allFiles) {
        const fileExtension = path.extname(f).substr(1);
        if (!match.includes(fileExtension)) {
          continue;
        }
        const fileContents = await fs.readFile(f, {encoding: 'utf8'});
        const fileBuilder = getFileBuilderForWorker(cwd, f, workerConfig, config);
        if (!fileBuilder) {
          continue;
        }
        let code = await fileBuilder(fileContents, {filename: f});
        if (!code) {
          continue;
        }
        let outPath = f.replace(dirDisk, dirDest);
        const extToFind = path.extname(f).substr(1);
        const extToReplace = srcFileExtensionMapping[extToFind];
        if (extToReplace) {
          outPath = outPath.replace(new RegExp(`${extToFind}$`), extToReplace!);
        }
        if (path.extname(outPath) === '.js') {
          code = await transformEsmImports(code, (spec) => {
            if (spec.startsWith('http')) {
              return spec;
            }
            if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
              const ext = path.extname(spec).substr(1);
              if (!ext) {
                return spec + '.js';
              }
              const extToReplace = srcFileExtensionMapping[ext];
              if (extToReplace) {
                spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
              }
              if (spec.endsWith('.module.css')) {
                const resolvedUrl = path.resolve(path.dirname(outPath), spec);
                allCssModules.add(resolvedUrl);
                spec = spec.replace('.module.css', '.css.module.js');
              } else if (!isBundled && (extToReplace || ext) !== 'js') {
                const resolvedUrl = path.resolve(path.dirname(outPath), spec);
                allProxiedFiles.add(resolvedUrl);
                spec = spec + '.proxy.js';
              }
              return spec;
            }
            if (dependencyImportMap.imports[spec]) {
              return path.posix.resolve(`/web_modules`, dependencyImportMap.imports[spec]);
            }
            let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
            if (missingPackageName.startsWith('@')) {
              missingPackageName += '/' + deepPackagePathParts.shift();
            }
            messageBus.emit('MISSING_WEB_MODULE', {
              spec: spec,
              pkgName: missingPackageName,
            });
            return `/web_modules/${spec}.js`;
          });
        }
        await fs.mkdir(path.dirname(outPath), {recursive: true});
        await fs.writeFile(outPath, code);
        allBuiltFromFiles.add(f);
      }
    }
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  for (const proxiedFileLoc of allCssModules) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length);
    const proxyCode = await wrapCssModuleResponse(proxiedUrl, proxiedCode, proxiedExt);
    const proxyFileLoc = proxiedFileLoc.replace('.module.css', '.css.module.js');
    await fs.writeFile(proxyFileLoc, proxyCode, {encoding: 'utf8'});
  }

  for (const proxiedFileLoc of allProxiedFiles) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length);
    const proxyCode = wrapEsmProxyResponse(proxiedUrl, proxiedCode, proxiedExt);
    const proxyFileLoc = proxiedFileLoc + '.proxy.js';
    await fs.writeFile(proxyFileLoc, proxyCode, {encoding: 'utf8'});
  }

  if (!isBundled) {
    messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: null});
    messageBus.emit('WORKER_UPDATE', {
      id: 'bundle:*',
      state: ['SKIP', isBundledHardcoded ? 'dim' : 'yellow'],
    });
    if (!isBundledHardcoded) {
      messageBus.emit('WORKER_MSG', {
        id: 'bundle:*',
        level: 'log',
        msg: `npm install --save-dev parcel-bundler \n\nInstall Parcel into your project to bundle for production.\nSet "devOptions.bundle = false" to remove this message.`,
      });
    }
  } else {
    messageBus.emit('WORKER_UPDATE', {id: 'bundle:*', state: ['RUNNING', 'yellow']});

    async function prepareBuildDirectoryForParcel() {
      // Prepare the new build directory by copying over all static assets
      // This is important since sometimes Parcel doesn't pick these up.
      await copy(buildDirectoryLoc, finalDirectoryLoc, {
        filter: (srcLoc) => {
          return !allBuiltFromFiles.has(srcLoc);
        },
      }).catch((err) => {
        messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'error', msg: err.toString()});
        messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: err});
        throw err;
      });
      const tempBuildManifest = JSON.parse(
        await fs.readFile(path.join(cwd, 'package.json'), {encoding: 'utf-8'}),
      );
      delete tempBuildManifest.name;
      delete tempBuildManifest.babel;
      tempBuildManifest.devDependencies = tempBuildManifest.devDependencies || {};
      tempBuildManifest.devDependencies['@babel/core'] =
        tempBuildManifest.devDependencies['@babel/core'] || '^7.9.0';
      tempBuildManifest.browserslist =
        tempBuildManifest.browserslist || '>0.75%, not ie 11, not UCAndroid >0, not OperaMini all';
      await fs.writeFile(
        path.join(buildDirectoryLoc, 'package.json'),
        JSON.stringify(tempBuildManifest, null, 2),
      );
      await fs.writeFile(
        path.join(buildDirectoryLoc, '.babelrc'),
        `{"plugins": [[${JSON.stringify(require.resolve('@babel/plugin-syntax-import-meta'))}]]}`, // JSON.stringify is needed because on windows, \ in paths need to be escaped
      );
      const fallbackFile = await fs.readFile(
        path.join(buildDirectoryLoc, config.devOptions.fallback),
        {encoding: 'utf-8'},
      );
      await fs.writeFile(
        path.join(buildDirectoryLoc, config.devOptions.fallback),
        fallbackFile.replace(/type\=\"module\"/g, ''),
      );
      // Remove PostCSS config since it's no longer needed. Parcel does its own optimization.
      rimraf.sync(path.join(buildDirectoryLoc, 'postcss.config.js'));
      rimraf.sync(path.join(buildDirectoryLoc, '.postcssrc'));
      rimraf.sync(path.join(buildDirectoryLoc, '.postcssrc.js'));
    }

    await prepareBuildDirectoryForParcel();

    const parcelOptions = ['build', config.devOptions.fallback, '--out-dir', finalDirectoryLoc];

    if (config.homepage) {
      parcelOptions.push('--public-url', config.homepage);
    }

    const bundleAppPromise = execa('parcel', parcelOptions, {
      cwd: buildDirectoryLoc,
      env: npmRunPath.env(),
      extendEnv: true,
    });
    bundleAppPromise.stdout?.on('data', (b) => {
      messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'log', msg: b.toString()});
    });
    bundleAppPromise.stderr?.on('data', (b) => {
      messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'log', msg: b.toString()});
    });
    bundleAppPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: err});
    });
    bundleAppPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: null});
    });
    await bundleAppPromise;
  }

  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
  }
}
