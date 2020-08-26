import { generateSW as _generateSW, GenerateSWConfig } from 'workbox-build';
import {resolve } from 'path'
// @ts-ignore
import type { SnowpackPluginFactory } from 'snowpack'
import { pluginName, report } from './utils'

export const generateSW: SnowpackPluginFactory<GenerateSWConfig> = (_, pluginOptions = {} as GenerateSWConfig) => {
  const { swDest, globDirectory, ...generateSWConfig } = pluginOptions;

  if (!swDest) throw new Error('No service worker destination specified');

  const reportResult = report(swDest)
  return {
    name: `${pluginName}/generateSW`,
    async optimize({ buildDirectory }) {
      const result = await _generateSW({
        ...generateSWConfig,
        swDest: resolve(buildDirectory, swDest),
        globDirectory: buildDirectory
      })
      reportResult(result)
    }
  }
}

export default generateSW