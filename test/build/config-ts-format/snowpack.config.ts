import type {SnowpackConfig} from '../../../snowpack/src';
import dist from './export';

const config: Partial<SnowpackConfig> = {
  mount: {
    './src': dist,
  },
};

export default config;
