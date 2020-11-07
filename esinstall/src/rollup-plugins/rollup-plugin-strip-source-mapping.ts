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
      code: code
        // [a-zA-Z0-9-_\*?\.\/\&=+%]: valid URL characters (for sourcemaps)
        .replace(/\/\/#\s*sourceMappingURL=[a-zA-Z0-9-_\*\?\.\/\&=+%\s]+$/gm, ''),
      map: null,
    }),
  };
}
