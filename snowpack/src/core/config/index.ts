import slash from 'slash';
import {fileURLToPath} from 'url';
import {Config, InitConfig} from '../../@types/snowpack';
import {ext} from '../util/filename';
import {normalizeConfig} from './normalize';
import {validateConfig} from './validate';

export async function readConfigFile(configURL: URL): Promise<InitConfig> {
  const isJSON = ext(configURL.href) === '.json';
  if (isJSON) {
    throw new Error(`JSON config no longer supported. Please use snowpack.config.mjs instead.`);
  }
  const rawConfig = await import(fileURLToPath(configURL));
  const cwd = new URL('./', configURL); // grab parent directory as cwd (to resolve all relative URLs to)
  return createConfig(rawConfig, cwd);
}

/** Create new config from object in memory */
export function createConfig(
  userConfig: Partial<Config> = {},
  cwd: URL = new URL(`file://${slash(process.cwd())}/`),
): InitConfig {
  validateConfig(userConfig);
  return normalizeConfig(userConfig, cwd);
}
