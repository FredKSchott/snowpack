import inject from '@rollup/plugin-inject';
import {Plugin} from 'rollup';
import {EnvVarReplacements} from '../types/snowpack';

export function rollupPluginNodeProcessPolyfill(vars: EnvVarReplacements = {}): Plugin {
  const injectPlugin = inject({
    process: 'process',
  });

  return {
    ...injectPlugin,
    name: 'snowpack:rollup-plugin-node-process-polyfill',
    resolveId(source) {
      if (source === 'process') {
        return 'process';
      }

      return null;
    },
    load(id) {
      if (id === 'process') {
        return createProcessPolyfill(vars);
      }

      return null;
    },
  };
}

function createProcessPolyfill(vars: EnvVarReplacements = {}) {
  const env = Object.keys(vars).reduce((acc, id) => {
    return {
      ...acc,
      [id]: vars[id] === true ? process.env[id] : vars[id],
    };
  }, {});

  return `/* SNOWPACK POLYFILL - process */
export default {
  title: 'browser',
  browser: true,
  env: ${JSON.stringify(env)},
  argv: [],
  version: '',
  versions: {},
  platform: 'browser',
  release: {},
  config: {}
};`;
}
