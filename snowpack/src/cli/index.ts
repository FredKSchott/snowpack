import fs from 'fs';
import slash from 'slash';
import yargs from 'yargs-parser';
import type {Config} from '../@types/snowpack';
import {createConfig, readConfigFile} from '../core/config';
import build from './build';
import dev from './dev';

export async function run() {
  const cmd = process.argv[0];
  const cwd = new URL(`file://${slash(process.cwd())}/`);
  const args = yargs(process.argv);

  // 1. load config
  let configLoc: URL | undefined;
  let userConfig: Config | undefined;
  if (args.config) {
    configLoc = new URL(args.config, cwd);
  } else {
    for (const filename of [
      'snowpack.config.mjs',
      'snowpack.config.js',
      'snowpack.config.cjs',
      'snowpack.config.json',
    ]) {
      const possibleLoc = new URL(filename, cwd);
      if (fs.existsSync(possibleLoc)) {
        configLoc = possibleLoc;
        break;
      }
    }
  }
  if (configLoc) userConfig = await readConfigFile(configLoc);
  const config = createConfig(userConfig, cwd);

  // 2. run command
  switch (cmd) {
    case 'build': {
      await build({config, cwd});
      break;
    }
    case 'dev': {
      await dev({config, cwd});
      break;
    }
    default: {
      throw new Error(`Unknown command: "${cmd}"`);
    }
  }
}
