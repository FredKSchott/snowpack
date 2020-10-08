import type {SnowpackConfig} from '../../../snowpack/src';

const config: Partial<SnowpackConfig> = {
  mount: {
    './src': '/_dist',
  },
};

export default config
