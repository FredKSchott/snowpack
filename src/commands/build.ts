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
  const buildDirectoryLoc = isBundled
    ? await fs.mkdtemp(path.join(os.tmpdir(), `snowpack-build`))
    : config.dev.out;
  const distDirectoryLoc = path.join(buildDirectoryLoc, config.dev.dist);

  rimraf.sync(finalDirectoryLoc);

  for (const [id, workerConfig] of allRegisteredWorkers) {
    if (
      id.startsWith('build:') ||
      id.startsWith('plugin:') ||
      id.startsWith('lintall:') ||
      id.startsWith('mount:')
    ) {
      relevantWorkers.push([id, workerConfig]);
    }
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

  if (isBundled) {
    relevantWorkers.push(['bundle:*', {cmd: 'NA', watch: undefined}]);
  }

  paint(messageBus, relevantWorkers);

  for (const [id, workerConfig] of relevantWorkers) {
    if (id.startsWith('lintall:')) {
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

    let {cmd} = workerConfig;
    if (id.startsWith('mount:')) {
      const cmdArr = workerConfig.cmd.split(/\s+/);
      if (cmdArr[0] !== 'mount') {
        throw new Error(`script[${id}] must use the mount command`);
      }
      cmdArr.unshift();
      let dirUrl, dirDisk;
      if (cmdArr.length === 1) {
        dirDisk = path.resolve(cwd, cmdArr[0]);
        dirUrl = cmdArr[0];
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
      continue;
    }
    if (id.startsWith('build:')) {
      let files: string[];
      const extMatcher = id.split(':')[1];
      if (extMatcher.includes(',')) {
        files = glob.sync(`${config.dev.src}/**/*.{${extMatcher}}`, {
          nodir: true,
          ignore: [
            `${config.dev.src}/**/__tests__/**/*.{js,jsx,ts,tsx}`,
            `${config.dev.src}/**/*.{spec,test}.{js,jsx,ts,tsx}`,
          ],
        });
      } else {
        files = glob.sync(`${config.dev.src}/**/*.${extMatcher}`, {
          nodir: true,
          ignore: [
            `${config.dev.src}/**/__tests__/**/*.{js,jsx,ts,tsx}`,
            `${config.dev.src}/**/*.{spec,test}.{js,jsx,ts,tsx}`,
          ],
        });
      }
      for (const f of files) {
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
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    }
    if (id.startsWith('plugin:')) {
      let files: string[];
      const extMatcher = id.split(':')[1];
      if (extMatcher.includes(',')) {
        files = glob.sync(`${config.dev.src}/**/*.{${extMatcher}}`, {
          nodir: true,
          ignore: [
            `${config.dev.src}/**/__tests__/**/*.{js,jsx,ts,tsx}`,
            `${config.dev.src}/**/*.{spec,test}.{js,jsx,ts,tsx}`,
          ],
        });
      } else {
        files = glob.sync(`${config.dev.src}/**/*.${extMatcher}`, {
          nodir: true,
          ignore: [
            `${config.dev.src}/**/__tests__/**/*.{js,jsx,ts,tsx}`,
            `${config.dev.src}/**/*.{spec,test}.{js,jsx,ts,tsx}`,
          ],
        });
      }
      const {build} = require(cmd);
      for (const f of files) {
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
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    }
  }

  await Promise.all(allWorkerPromises);

  if (isBundled) {
    await fs.copyFile(path.join(cwd, 'package.json'), path.join(buildDirectoryLoc, 'package.json'));

    await fs.writeFile(
      path.join(buildDirectoryLoc, '.babelrc'),
      `{"plugins": [["${require.resolve('@babel/plugin-syntax-import-meta')}"]]}`,
    );

    const bundleAppPromise = execa(
      'parcel',
      ['build', config.dev.fallback, '--out-dir', finalDirectoryLoc],
      {
        cwd: buildDirectoryLoc,
        env: npmRunPath.env(),
        extendEnv: true,
      },
    );
    bundleAppPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: err});
    });
    bundleAppPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: null});
    });
    await bundleAppPromise;
  }

  return new Promise(() => {});
}
