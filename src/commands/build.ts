import chalk from 'chalk';
import {EventEmitter} from 'events';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import path from 'path';
import {promises as fs, createReadStream, existsSync} from 'fs';
import os from 'os';
import glob from 'glob';
import {SnowpackConfig, DevScript} from '../config';
import {paint} from './paint';
import rimraf from 'rimraf';
import yargs from 'yargs-parser';
import srcFileExtensionMapping from './src-file-extension-mapping';
import {transformEsmImports} from '../rewrite-imports';
import mkdirp from 'mkdirp';
const {copy} = require('fs-extra');

interface DevOptions {
  cwd: string;
  config: SnowpackConfig;
}

export async function command({cwd, config}: DevOptions) {
  console.log(chalk.bold('☶ Snowpack Build'));
  console.log('NOTE: Still experimental, default behavior may change.');

  const messageBus = new EventEmitter();
  const allRegisteredWorkers = Object.entries(config.scripts);
  const relevantWorkers: [string, DevScript][] = [];
  const allWorkerPromises: Promise<any>[] = [];

  const isBundled = config.dev.bundle;
  const finalDirectoryLoc = config.dev.out;
  const buildDirectoryLoc = isBundled ? path.join(cwd, `.build`) : config.dev.out;
  const distDirectoryLoc = path.join(buildDirectoryLoc, config.dev.dist);

  rimraf.sync(finalDirectoryLoc);
  mkdirp.sync(finalDirectoryLoc);
  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
    mkdirp.sync(buildDirectoryLoc);
  }

  const extToWorkerMap: {[ext: string]: any[]} = {};
  for (const [id, workerConfig] of allRegisteredWorkers) {
    if (
      id.startsWith('build:') ||
      id.startsWith('plugin:') ||
      id.startsWith('lintall:') ||
      id.startsWith('mount:')
    ) {
      relevantWorkers.push([id, workerConfig]);
    }
    if (id.startsWith('build:') || id.startsWith('plugin:')) {
      const exts = id.split(':')[1].split(',');
      for (const ext of exts) {
        extToWorkerMap[ext] = extToWorkerMap[ext] || [];
        extToWorkerMap[ext].push([id, workerConfig]);
      }
    }
  }

  if (isBundled) {
    relevantWorkers.push(['bundle:*', {cmd: 'NA', watch: undefined}]);
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
  let relDest = path.relative(cwd, config.dev.out);
  if (!relDest.startsWith(`..${path.sep}`)) {
    relDest = `.${path.sep}` + relDest;
  }
  paint(messageBus, relevantWorkers, {dest: relDest}, undefined);

  for (const [id, workerConfig] of relevantWorkers) {
    if (!id.startsWith('lintall:')) {
      continue;
    }
    const workerPromise = execa.command(workerConfig.cmd, {
      env: npmRunPath.env(),
      extendEnv: true,
      shell: true,
    });
    allWorkerPromises.push(workerPromise);
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
  }

  for (const [id, workerConfig] of relevantWorkers) {
    if (!id.startsWith('mount:')) {
      continue;
    }
    const cmdArr = workerConfig.cmd.split(/\s+/);
    if (cmdArr[0] !== 'mount') {
      throw new Error(`script[${id}] must use the mount command`);
    }
    cmdArr.shift();
    let dirUrl, dirDisk;
    if (cmdArr.length === 1) {
      dirDisk = path.resolve(cwd, cmdArr[0]);
      dirUrl = '/' + cmdArr[0];
    } else {
      const {to} = yargs(cmdArr);
      dirDisk = path.resolve(cwd, cmdArr[0]);
      dirUrl = to;
    }

    const destinationFile =
      dirUrl === '/' ? buildDirectoryLoc : path.join(buildDirectoryLoc, dirUrl);
    await copy(dirDisk, destinationFile).catch((err) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
      throw err;
    });
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  const allFiles = glob.sync(`${config.dev.src}/**/*`, {
    nodir: true,
    ignore: [`${config.dev.src}/**/__tests__`, `${config.dev.src}/**/*.{spec,test}.*`],
  });

  for (const [id, workerConfig] of relevantWorkers) {
    if (!id.startsWith('build:') && !id.startsWith('plugin:')) {
      continue;
    }
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    for (const f of allFiles) {
      const fileExtension = path.extname(f).substr(1);
      if (!id.includes(`:${fileExtension}`) && !id.includes(`,${fileExtension}`)) {
        continue;
      }

      let {cmd} = workerConfig;
      if (id.startsWith('build:')) {
        const {stdout, stderr} = await execa.command(cmd, {
          env: npmRunPath.env(),
          extendEnv: true,
          shell: true,
          input: createReadStream(f),
        });
        if (stderr) {
          const missingWebModuleRegex = /warn\: bare import "(.*?)" not found in import map\, ignoring\.\.\./m;
          const missingWebModuleMatch = stderr.match(missingWebModuleRegex);
          if (missingWebModuleMatch) {
            messageBus.emit('MISSING_WEB_MODULE', {specifier: missingWebModuleMatch[1]});
            messageBus.emit('WORKER_COMPLETE', {id, error: new Error(`[${id}] ${stderr}`)});
          }
          console.error(stderr);
          continue;
        }
        let outPath = f.replace(config.dev.src, distDirectoryLoc);
        const extToFind = path.extname(f).substr(1);
        const extToReplace = srcFileExtensionMapping[extToFind];
        if (extToReplace) {
          outPath = outPath.replace(new RegExp(`${extToFind}$`), extToReplace!);
        }
        let code = stdout;
        if (path.extname(outPath) === '.js') {
          code = await transformEsmImports(code, (spec) => {
            if (spec.startsWith('http') || spec.startsWith('/')) {
              return spec;
            }
            if (spec.startsWith('./') || spec.startsWith('../')) {
              const ext = path.extname(spec).substr(1);
              if (!ext) {
                console.error(`${f}: Import ${spec} is missing a required file extension.`);
                return spec;
              }
              const extToReplace = srcFileExtensionMapping[ext];
              if (extToReplace) {
                return spec.replace(new RegExp(`${ext}$`), extToReplace);
              }
              return spec;
            }
            return `/web_modules/${spec}.js`;
          });
        }
        await fs.mkdir(path.dirname(outPath), {recursive: true});
        await fs.writeFile(outPath, code);
      }
      if (id.startsWith('plugin:')) {
        const modulePath = require.resolve(cmd, {paths: [cwd]});
        const {build} = require(modulePath);
        try {
          var {result} = await build(f);
        } catch (err) {
          err.message = `[${id}] ${err.message}`;
          console.error(err);
          messageBus.emit('WORKER_COMPLETE', {id, error: err});
          continue;
        }
        let outPath = f.replace(config.dev.src, distDirectoryLoc);
        const extToFind = path.extname(f).substr(1);
        const extToReplace = srcFileExtensionMapping[extToFind];
        if (extToReplace) {
          outPath = outPath.replace(new RegExp(`${extToFind}$`), extToReplace);
        }
        let code = result;
        if (path.extname(outPath) === '.js') {
          code = await transformEsmImports(code, (spec) => {
            if (spec.startsWith('http') || spec.startsWith('/')) {
              return spec;
            }
            if (spec.startsWith('./') || spec.startsWith('../')) {
              const ext = path.extname(spec).substr(1);
              if (!ext) {
                console.error(`${f}: Import ${spec} is missing a required file extension.`);
                return spec;
              }
              const extToReplace = srcFileExtensionMapping[ext];
              if (extToReplace) {
                return spec.replace(new RegExp(`${ext}$`), extToReplace);
              }
              return spec;
            }
            return `/web_modules/${spec}.js`;
          });
        }
        await fs.mkdir(path.dirname(outPath), {recursive: true});
        await fs.writeFile(outPath, code);
      }
    }
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  await Promise.all(allWorkerPromises);

  if (isBundled) {
    messageBus.emit('WORKER_UPDATE', {id: 'bundle:*', state: ['RUNNING', 'yellow']});
    async function prepareBuildDirectoryForParcel() {
      const tempBuildManifest = JSON.parse(
        await fs.readFile(path.join(cwd, 'package.json'), {encoding: 'utf-8'}),
      );
      delete tempBuildManifest.name;
      tempBuildManifest.devDependencies = tempBuildManifest.devDependencies || {};
      tempBuildManifest.devDependencies['@babel/core'] =
        tempBuildManifest.devDependencies['@babel/core'] || '^7.9.0';
      await fs.writeFile(
        path.join(buildDirectoryLoc, 'package.json'),
        JSON.stringify(tempBuildManifest, null, 2),
      );
      await fs.writeFile(
        path.join(buildDirectoryLoc, '.babelrc'),
        `{"plugins": [["${require.resolve('@babel/plugin-syntax-import-meta')}"]]}`,
      );
    }
    await prepareBuildDirectoryForParcel();

    const bundleAppPromise = execa(
      'parcel',
      ['build', config.dev.fallback, '--out-dir', finalDirectoryLoc],
      {
        cwd: buildDirectoryLoc,
        env: npmRunPath.env(),
        extendEnv: true,
      },
    );
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
}
