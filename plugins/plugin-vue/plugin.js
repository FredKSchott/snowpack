const fs = require('fs');
const path = require('path');
const hashsum = require('hash-sum');
const compiler = require('@vue/compiler-sfc');
const scriptCompilers = require('./src/script-compilers');
const replace = require('@rollup/plugin-replace');

const inlineSourcemap = (code, map) =>
  code +
  '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
  new Buffer(map.toString()).toString('base64');

/** Friendly error display */
function displayError({contents, filePath, error}) {
  const pad = (number, pad) => `${Array.from(new Array(pad + 1)).join(' ')}${number}`;

  let output = [`${error.toString()}`, `[${filePath}]`];
  if (error.loc) {
    output[1] += ` Line ${error.loc.start.line}, Column ${error.loc.start.column}`;
    const lineNo = (number) =>
      ' ' +
      pad(number, (error.loc.end.line + 1).toString().length - number.toString().length) +
      ' | ';
    output.push('');
    const allLines = ['', ...contents.split('\n')];
    let currentLine = error.loc.start.line;
    output.push(lineNo(currentLine - 1) + allLines[currentLine - 1]);
    while (currentLine <= error.loc.end.line) {
      output.push(lineNo(currentLine) + allLines[currentLine]);
      currentLine++;
    }
    output.push(
      Array.from(new Array(error.loc.start.column + lineNo(currentLine - 1).length)).join(' ') +
        '^',
    );
    output.push(lineNo(currentLine) + allLines[currentLine]);
  }
  return output.join('\n');
}

module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  // Enable proper tree-shaking for Vue's ESM bundler
  // See http://link.vuejs.org/feature-flags
  const packageOptions = snowpackConfig.packageOptions || snowpackConfig.installOptions;
  if (packageOptions && packageOptions.source === 'local') {
    packageOptions.rollup = packageOptions.rollup || {};
    packageOptions.rollup.plugins = packageOptions.rollup.plugins || [];
    const {optionsApi = true, prodDevtools = false} = pluginOptions;
    packageOptions.rollup.plugins.push(
      replace({
        preventAssignment: false,
        values: {
          __VUE_OPTIONS_API__: JSON.stringify(optionsApi),
          __VUE_PROD_DEVTOOLS__: JSON.stringify(prodDevtools),
        },
      }),
    );
  }
  return {
    name: '@snowpack/plugin-vue',
    resolve: {
      input: ['.vue'],
      output: ['.js', '.css'],
    },
    async load({filePath, isSSR}) {
      const {sourcemap, sourceMaps} = snowpackConfig.buildOptions;

      const id = hashsum(filePath);
      const contents = fs.readFileSync(filePath, 'utf-8');
      const {descriptor, errors} = compiler.parse(contents, {filename: filePath});

      // display errors
      if (errors && errors.length > 0) {
        throw new Error(displayError({error: errors[0], contents, filePath}));
      }

      const output = {
        '.js': {code: '', map: ''},
        '.css': {code: '', map: ''},
      };

      if (descriptor.script) {
        const scriptLang = descriptor.script.lang;
        let scriptContent = descriptor.script.content;
        if (['jsx', 'ts', 'tsx'].includes(scriptLang)) {
          scriptContent = scriptCompilers.esbuildCompile(scriptContent, scriptLang);
        }
        if (['js', 'ts'].includes(scriptLang) || !scriptLang) {
          scriptContent = scriptContent.replace(`export default`, 'const defaultExport =');
        }
        output['.js'].code += scriptContent;
      } else {
        output['.js'].code += `const defaultExport = {};\n`;
      }

      let hasCssModules = false;
      const cssModules = {};

      await Promise.all(
        descriptor.styles.map(async (stylePart) => {
          // note: compileStyleAsync is required for SSR + CSS Modules
          const css = await compiler.compileStyleAsync({
            filename: path.relative(snowpackConfig.root || process.cwd(), filePath),
            source: stylePart.content,
            id: `data-v-${id}`,
            scoped: stylePart.scoped != null,
            modules: stylePart.module != null,
            ssr: isSSR,
            preprocessLang: stylePart.lang,
            // preprocessCustomRequire: (id: string) => require(resolve(root, id))
            // TODO load postcss config if present
          });

          // gather CSS Module names
          if (stylePart.module) {
            hasCssModules = true;
            for (const [k, v] of Object.entries(css.modules)) {
              if (cssModules[k]) console.warn(`CSS Module name reused: ${k}`);
              cssModules[k] = v;
            }
          }

          if (css.errors && css.errors.length > 0) {
            console.error(JSON.stringify(css.errors));
          }
          output['.css'].code += css.code;
          if ((sourcemap || sourceMaps) && css.map) output['.css'].map += JSON.stringify(css.map);
        }),
      );

      if (descriptor.template) {
        const scoped = descriptor.styles.some((s) => s.scoped);

        const js = compiler.compileTemplate({
          id,
          filename: path.relative(snowpackConfig.root || process.cwd(), filePath),
          source: descriptor.template.content,
          ssr: isSSR,
          ssrCssVars: [],
          preprocessLang: descriptor.template.lang,
          compilerOptions: {
            scopeId: scoped ? `data-v-${id}` : null,
          },
        });
        if (js.errors && js.errors.length > 0) {
          console.error(JSON.stringify(js.errors));
        }

        const renderFn = isSSR ? `ssrRender` : `render`;

        if (output['.js'].code) output['.js'].code += '\n';
        output['.js'].code += `${js.code.replace(/;?$/, ';')}`; // add trailing semicolon if missing (helps with some SSR cases)
        output['.js'].code += `\n\ndefaultExport.${renderFn} = ${renderFn};`;

        if ( scoped ) {
          output['.js'].code += `\n\ndefaultExport.__scopeId = "data-v-${ id }";`
        }

        // inject CSS Module styles, if needed
        if (hasCssModules) {
          // Note: this injection code is inspired by the official vue-loader for webpack and plays nicely with Vue.
          // But adjustments were needed to work with Snowpack.
          // See https://github.com/vuejs/vue-loader/blob/master/lib/codegen/styleInjection.js#L51
          const styleInjectionCode = `  const cssModules = ${JSON.stringify(cssModules)};
  Object.defineProperty(_ctx, '$style', {
    configurable: true,
    get: function() {
      return cssModules;
    }
  })\n`;
          output['.js'].code = output['.js'].code.replace(
            new RegExp(`(function ${renderFn}\\([^\n]+)`),
            `$1\n${styleInjectionCode}`,
          );
        }
        output['.js'].code += `\n\nexport default defaultExport;`;

        if ((sourcemap || sourceMaps) && js.map) {
          output['.js'].code = inlineSourcemap(output['.js'].code, JSON.stringify(js.map));
          output['.js'].map += JSON.stringify(js.map);
        }
      }

      // clean up
      if (!output['.js'].code) delete output['.js'];
      if (!output['.css'].code) delete output['.css'];

      return output;
    },
  };
};
