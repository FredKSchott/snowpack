const esbuild = require('esbuild');

const codeSnippetH = `import { Fragment } from '/web_modules/vue.js';`;

// https://github.com/vitejs/vite/blob/master/src/client/vueJsxCompat.ts
const codeSnippetVueJsxCompat = 
`import {createVNode, isVNode} from '/web_modules/vue.js';
const slice = Array.prototype.slice;
export function jsx(tag, props = null, children = null) {
  if (arguments.length > 3 || isVNode(children)) {
    children = slice.call(arguments, 2);
  }
  return createVNode(tag, props, children);
}`;

/**
 * @param {string} content
 * @param {'jsx' | 'ts' | 'tsx'} lang
 * @param {string} [tsconfig]
 */
const esbuildCompile = (content, lang, tsconfig) => {
  let result = '';
  if (['jsx', 'tsx'].includes(lang)) {
    result += `${codeSnippetH}\n`;
    result += `${codeSnippetVueJsxCompat}\n`;
  }
  const {js} = esbuild.transformSync(content, {
    loader: lang,
    tsconfig,
    jsxFactory: tsconfig ? undefined : 'jsx',
    jsxFragment: tsconfig ? undefined : 'Fragment',
  });
  result += `\n${js.trim()}\n`;
  return result.trim();
};

module.exports = {
  esbuildCompile,
};
