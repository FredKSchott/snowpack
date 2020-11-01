// Experimental support for a TS config file!
import type {SnowpackUserConfig} from 'snowpack';

export default {
  mount: {
    './src': '/_dist_',
  },
} as SnowpackUserConfig;
