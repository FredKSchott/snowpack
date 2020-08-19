import { generateSW as _generateSw, injectManifest as _injectManifest } from 'workbox-build';
import type { SnowpackPluginFactory } from 'snowpack'

export type WorkboxOptions = {

}

const plugin: SnowpackPluginFactory<WorkboxOptions> = function WorkboxPlugin(snowpackConfig, pluginOptions) {
  return {
    name: '@snowpack/plugin-workbox',
    async optimize({ buildDirectory }) {

    }
  }
}