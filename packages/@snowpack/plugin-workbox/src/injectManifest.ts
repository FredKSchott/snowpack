import { injectManifest as _injectManifest, InjectManifestConfig } from 'workbox-build';
import type { SnowpackPluginFactory } from 'snowpack'
import { pluginName, report } from './utils'

export const injectManifest: SnowpackPluginFactory<InjectManifestConfig> = (_, pluginOptions = {} as InjectManifestConfig) => {
  const { swSrc, swDest } = pluginOptions;

  if (!swSrc) throw new Error('No service worker source specified');
  if (!swDest) throw new Error('No service worker destination specified');

  const reportResult = report(swDest)
  return {
    name: `${pluginName}/injectManifest`,
    async optimize({ buildDirectory }) {
      const result = await _injectManifest({...pluginOptions, globDirectory: buildDirectory})
      reportResult(result)
    }
  }
}

export default injectManifest