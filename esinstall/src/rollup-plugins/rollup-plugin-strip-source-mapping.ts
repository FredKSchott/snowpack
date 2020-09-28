import {Plugin} from 'rollup';

/**
 * rollup-plugin-strip-source-mapping
 *
 * Remove any lingering source map comments
 */
export function rollupPluginStripSourceMapping(): Plugin {
  return {
    name: 'snowpack:rollup-plugin-strip-source-mapping',
    transform: (code) => ({
      code: code.replace(/[^'"`]\/\/+#\s*sourceMappingURL=.+$/gm, ''),
      map: null,
    }),
  };
}
