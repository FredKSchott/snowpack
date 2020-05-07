import {Plugin} from 'rollup';
import path from 'path';

/**
 * rollup-plugin-react-fix
 *
 * React is such a strange package, and causes some strange bug in
 * Rollup where this export is expected but missing. Adding it back
 * ourselves manually here.
 */
export function rollupPluginReactFix() {
  return {
    name: 'snowpack:rollup-plugin-react-fix',
    transform(code, id) {
      if (id.endsWith(path.join('react', 'index.js'))) {
        return code + `\nexport { react as __moduleExports };`;
      }
    },
  } as Plugin;
}
