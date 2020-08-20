import { injectManifest, InjectManifestConfig } from 'workbox-build';
import type { SnowpackPluginFactory } from 'snowpack'

const inject: SnowpackPluginFactory<InjectManifestConfig> = function WorkboxPlugin(_, pluginOptions) {
  return {
    name: '@snowpack/plugin-workbox/injectManifest',
    async optimize({ buildDirectory }) {
      const result = await injectManifest({
        ...pluginOptions,
        globDirectory: buildDirectory
      })
      console.log(result)
    }
  }
}

export default inject