import inject from '@rollup/plugin-inject';
import {Plugin} from 'rollup';
import {EnvVarReplacements} from '../types/snowpack';
import generateProcessPolyfill from './generateProcessPolyfill';

const PROCESS_MODULE_NAME = 'process';
export function rollupPluginNodeProcessPolyfill(vars: EnvVarReplacements = {}): Plugin {
  const injectPlugin = inject({
    process: PROCESS_MODULE_NAME,
  });

  return {
    ...injectPlugin,
    name: 'snowpack:rollup-plugin-node-process-polyfill',
    resolveId(source) {
      if (source === PROCESS_MODULE_NAME) {
        return PROCESS_MODULE_NAME;
      }

      return null;
    },
    load(id) {
      if (id === PROCESS_MODULE_NAME) {
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

  return {code: generateProcessPolyfill(env), moduleSideEffects: false};
}
