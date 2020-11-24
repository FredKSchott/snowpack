import inject from '@rollup/plugin-inject';
import {Plugin} from 'rollup';
import generateProcessPolyfill from './generateProcessPolyfill';

const PROCESS_MODULE_NAME = 'process';
export function rollupPluginNodeProcessPolyfill(env = {}): Plugin {
  const injectPlugin = inject({
    process: PROCESS_MODULE_NAME,
    include: ['*.js', '*.mjs', '*.cjs'],
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
        return {code: generateProcessPolyfill(env), moduleSideEffects: false};
      }

      return null;
    },
  };
}
