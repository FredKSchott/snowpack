/**
MIT License

Copyright (c) 2020 The Preact Authors

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

import fs from 'fs';
// import glob from 'glob';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import builtins from 'builtin-modules';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';


if (fs.readFileSync(path.resolve(__dirname, '../lib/index.js'), 'utf8').startsWith(`'use strict';`)) {
  throw new Error('Input is already bundled! Re-run build to regenerate');
}

// import execa from 'execa';
// execa.commandSync(`yarn webpack -c ${require.resolve('./generate-vendor.js')}`);

const config = {
  input: path.resolve(__dirname, '../lib/index.js'),
  inlineDynamicImports: true,
  output: [
    {
      file: path.resolve(__dirname, '../lib/index.js'),
      format: 'cjs',
      compact: true,
      freeze: false,
      interop: false,
      namespaceToStringTag: false,
      externalLiveBindings: false,
      preferConst: true,
      exports: 'auto',
    },
  ],
  external: (f) => {
    // esbuild needs to be installed on your machine (Go, not JS).
    // This should be the Snowpack packages only dependency.
    if (['esbuild', 'esinstall', 'snowpack', 'postcss', 'postcss-modules'].includes(f)) {
      return true;
    }
    // vm2 can't be bundled, so we vendor the entire directory as-is.
    // It has no dependencies, so this is okay.
    if (f.includes('vendor/vm2/')) {
      return true;
    }
    // Mark all node.js built-ins as external.
    return builtins.includes(f);
  },
  plugins: [
    alias({
      entries: [
        // bypass native modules aimed at production WS performance:
        {find: /^bufferutil$/, replacement: `bufferutil${path.sep}fallback.js`},
        {find: /^utf-8-validate$/, replacement: `utf-8-validate${path.sep}fallback.js`},
        // just use native streams:
        {
          find: /(^|[/\\])readable-stream$/,
          replacement: require.resolve('../vendor/~readable-stream.js'),
        },
        {
          find: /(^|[/\\])readable-stream[/\\]duplex/,
          replacement: require.resolve('../vendor/~readable-stream-duplex.js'),
        },
        // just use util:
        {find: /^inherits$/, replacement: require.resolve('../vendor/~inherits.js')},
        // only pull in fsevents when its exports are accessed (avoids exceptions):
        {find: /^fsevents$/, replacement: require.resolve('../vendor/~fsevents.js')},
        // vm2 & others
        {find: /^vm2$/, replacement: require.resolve('../vendor/vm2/index.js')},
        {find: /^htmlparser2$/, replacement: require.resolve('../vendor/generated/~htmlparser2.js')},
      ],
    }),
    commonjs({
      exclude: [/\.mjs$/, /\/rollup\//, path.resolve('lib')],
      ignore: builtins,
      transformMixedEsModules: true,
    }),
    nodeResolve({
      preferBuiltins: true,
      rootDir: __dirname,
      extensions: ['.mjs', '.js', '.json', '.es6', '.node'],
    }),
    json(),
    // {
    //   name: 'clear-bundled-files',
    //   generateBundle() {
    //     glob
    //       .sync('**/*.js', {
    //         cwd: path.resolve('lib'),
    //         nodir: true,
    //         absolute: true,
    //       })
    //       .map((f) => fs.unlinkSync(f));
    //   },
    // },
  ],
};

export default config;
