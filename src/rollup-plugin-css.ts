import {Plugin} from 'rollup';
import {promises as fs} from 'fs';

function getInjectorCode(name: string, code: string) {
  return `
/** SNOWPACK INJECT STYLE: ${name} */
function __snowpack__injectStyle(css) {
  const headEl = document.head || document.getElementsByTagName('head')[0];
  const styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  if (styleEl.styleSheet) {
    styleEl.styleSheet.cssText = css;
  } else {
    styleEl.appendChild(document.createTextNode(css));
  }
  headEl.appendChild(styleEl);
}
__snowpack__injectStyle(${JSON.stringify(code)});\n`;
}

/**
 * rollup-plugin-css
 *
 * Support installing any imported CSS into your dependencies. This isn't strictly valid
 * ESM code, but it is popular in the npm ecosystem & web development ecosystems. It also
 * solves a problem that is difficult to solve otherwise (referencing CSS from JS) so for
 * those reasons we have added default support for importing CSS into Snowpack v2.
 */
export function rollupPluginCss() {
  return {
    name: 'snowpack:rollup-plugin-css',
    resolveId(source, importer) {
      if (!source.endsWith('.css')) {
        return null;
      }
      return this.resolve(source, importer, {skipSelf: true}).then((resolved) => {
        return resolved || null;
      });
    },
    async load(id: string) {
      if (!id.endsWith('.css')) {
        return null;
      }
      const code = await fs.readFile(id, {encoding: 'utf8'});
      const humanReadableName = id.replace(/.*node_modules[\/\\]/, '').replace(/[\/\\]/g, '/');
      return getInjectorCode(humanReadableName, code);
    },
  } as Plugin;
}
