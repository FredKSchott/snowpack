import isNodeBuiltin from 'is-builtin-module';
import {Plugin} from 'rollup';

/**
 * rollup-plugin-catch-unresolved
 *
 * Catch any unresolved imports to give proper warnings (Rollup default is to ignore).
 */
export function rollupPluginCatchUnresolved(): Plugin {
  return {
    name: 'snowpack:rollup-plugin-catch-unresolved',
    resolveId(id, importer) {
      // Ignore remote http/https imports
      if (id.startsWith('http://') || id.startsWith('https://')) {
        return false;
      }
      if (isNodeBuiltin(id)) {
        this.warn({
          id: importer,
          message: `"${id}" (Node.js built-in) could not be resolved. (https://www.snowpack.dev/#node-built-in-could-not-be-resolved)`,
        });
      } else {
        this.warn({
          id: importer,
          message: `"${id}" could not be resolved. (Is it installed?)`,
        });
      }
      return false;
    },
  };
}
