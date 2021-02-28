import builtinModules from 'builtin-modules';
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
      if (builtinModules.indexOf(id) !== -1) {
        this.warn({
          id: importer,
          message: `Module "${id}" (Node.js built-in) is not available in the browser. Run Snowpack with --polyfill-node to fix.`,
        });
      } else if (id.startsWith('./') || id.startsWith('../')) {
        this.warn({
          id: importer,
          message: `Import "${id}" could not be resolved from file.`,
        });
      } else {
        this.warn({
          id: importer,
          message: `Module "${id}" could not be resolved by Snowpack (Is it installed?).`,
        });
      }
      return false;
    },
  };
}
