import chalk from 'chalk';
import {EventEmitter} from 'events';
import execa from 'execa';
import npmRunPath from 'npm-run-path';
import path from 'path';
import fs from 'fs';
import glob from 'glob';
import {SnowpackConfig, DevScript} from '../config';
import {paint} from './paint';
const {copy} = require('fs-extra');

interface DevOptions {
  cwd: string;
  config: SnowpackConfig;
}

export async function command({cwd, config}: DevOptions) {
  console.log(chalk.bold('☶ Snowpack Build'));
  console.log('NOTE: Still experimental, default behavior may change.');

  const messageBus = new EventEmitter();
  const registeredWorkers = Object.entries(config.scripts);

  const buildDirectoryLoc = config.dev.out;
  const distDirectoryLoc = path.join(buildDirectoryLoc, config.dev.dist);
  const mountWorkers: [string, DevScript][] = [];

  for (const [dirDisk, dirUrl] of config.dev.mount) {
    const id = `mount:${path.relative(cwd, dirDisk)}`;
    mountWorkers.push([id, {cmd: 'NA', watch: undefined}]);
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

  paint(messageBus, [...mountWorkers, ...registeredWorkers], false);

  for (const [dirDisk, dirUrl] of config.dev.mount) {
    const id = `mount:${path.relative(cwd, dirDisk)}`;
    const destinationFile =
      dirUrl === '.' ? path.join(buildDirectoryLoc, dirUrl) : path.join(buildDirectoryLoc, dirUrl);
    const copyMountPromise = copy(dirDisk, destinationFile);
    copyMountPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    });
    copyMountPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    });
    mountWorkers.push([id, {cmd: 'NA', watch: undefined}]);
  }

  for (const [id, workerConfig] of registeredWorkers) {
    let {cmd} = workerConfig;
    if (!id.startsWith('build:')) {
      continue;
    }
    let files: string[];
    const extMatcher = id.split('::')[1] || id.split(':')[1];
    // const ext = extMatcher === '*' ? extMatcher.split(',')[0];
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
      });
    }
    for (const f of files) {
      const {stdout, stderr} = await execa.command(cmd, {
        env: npmRunPath.env(),
        extendEnv: true,
        shell: true,
        input: fs.createReadStream(f),
      });
      if (stderr) {
        const missingWebModuleRegex = /warn\: bare import "(.*?)" not found in import map\, ignoring\.\.\./m;
        const missingWebModuleMatch = stderr.match(missingWebModuleRegex);
        if (missingWebModuleMatch) {
          messageBus.emit('MISSING_WEB_MODULE', {specifier: missingWebModuleMatch[1]});
          messageBus.emit('WORKER_COMPLETE', {id, error: new Error(`[${id}] stderr`)});
        }
        console.error(stderr);
      }
      let outPath = f.replace(config.dev.src, distDirectoryLoc);
      if (id.split('::')[1]) {
        const extsToFind = id.split('::')[1].split(',');
        const extToReplace = id.split(':')[1];
        for (const ext of extsToFind) {
          outPath = outPath.replace(new RegExp(`${ext}$`), extToReplace!);
        }
      }
      fs.mkdirSync(path.dirname(outPath), {recursive: true});
      fs.writeFileSync(outPath, stdout);
    }
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  for (const [id, workerConfig] of registeredWorkers) {
    let {cmd} = workerConfig;
    if (!id.startsWith('buildall:')) {
      continue;
    }
    cmd = cmd.replace(/\$DIST/g, distDirectoryLoc);
    const workerPromise = execa.command(cmd, {env: npmRunPath.env(), extendEnv: true, shell: true});
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
    stderr?.on('data', (b) => {});
  }

  return new Promise(() => {});
}
