/*

This license applies to parts of this file originating from the
https://github.com/vitejs/vite repository:

MIT License

Copyright (c) 2019-present, Yuxi (Evan) You

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const esbuild = require('esbuild');

const codeSnippetH = `import { Fragment } from 'vue';`;

// https://github.com/vitejs/vite/blob/master/src/client/vueJsxCompat.ts
const codeSnippetVueJsxCompat = `import {createVNode, isVNode} from 'vue';
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
 */
const esbuildCompile = (content, lang) => {
  let result = '';
  if (['jsx', 'tsx'].includes(lang)) {
    result += `${codeSnippetH}\n`;
    result += `${codeSnippetVueJsxCompat}\n`;
  }
  const {code} = esbuild.transformSync(content, {
    loader: lang,
    jsxFactory: 'jsx',
    jsxFragment: 'Fragment',
  });
  result += `\n${code.trim()}\n`;
  return result.trim();
};

module.exports = {
  esbuildCompile,
};
