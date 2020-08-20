import { generateSW, GenerateSWConfig } from 'workbox-build';
import type { SnowpackPluginFactory } from 'snowpack'

const generate: SnowpackPluginFactory<GenerateSWConfig> = function WorkboxPlugin(_, pluginOptions) {
  return {
    name: '@snowpack/plugin-workbox/generateSW',
    async optimize({ buildDirectory }) {
      const result = await generateSW({
        ...pluginOptions,
        globDirectory: buildDirectory
      })
      console.log(result)
    }
  }
}

export default generate