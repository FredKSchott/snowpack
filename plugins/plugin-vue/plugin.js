const fs = require('fs');
const path = require('path');
const hashsum = require('hash-sum');
const compiler = require('@vue/compiler-sfc');
const scriptCompilers = require('./src/script-compilers');

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

module.exports = function plugin(snowpackConfig) {
  return {
    name: '@snowpack/plugin-vue',
    resolve: {
      input: ['.vue'],
      output: ['.js', '.css'],
    },
    async load({filePath}) {
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
        output['.js'].code += `const defaultExport = {};`;
      }
      await Promise.all(
        descriptor.styles.map((stylePart) => {
          const css = compiler.compileStyle({
            filename: path.relative(snowpackConfig.root || process.cwd(), filePath),
            source: stylePart.content,
            id: `data-v-${id}`,
            scoped: stylePart.scoped != null,
            modules: stylePart.module != null,
            preprocessLang: stylePart.lang,
            // preprocessCustomRequire: (id: string) => require(resolve(root, id))
            // TODO load postcss config if present
          });
          if (css.errors && css.errors.length > 0) {
            console.error(JSON.stringify(css.errors));
          }
          output['.css'].code += css.code;
          if ((sourcemap || sourceMaps) && css.map) output['.css'].map += JSON.stringify(css.map);
        }),
      );

      if (descriptor.template) {
        const js = compiler.compileTemplate({
          id,
          filename: path.relative(snowpackConfig.root || process.cwd(), filePath),
          source: descriptor.template.content,
          preprocessLang: descriptor.template.lang,
          compilerOptions: {
            scopeId: descriptor.styles.some((s) => s.scoped) ? `data-v-${id}` : null,
          },
        });
        if (js.errors && js.errors.length > 0) {
          console.error(JSON.stringify(js.errors));
        }
        output['.js'].code += `\n${js.code}\n`;
        output['.js'].code += `\ndefaultExport.render = render`;
        output['.js'].code += `\nexport default defaultExport`;

        if ((sourcemap || sourceMaps) && js.map) output['.js'].map += JSON.stringify(js.map);
      }

      // clean up
      if (!output['.js'].code) delete output['.js'];
      if (!output['.css'].code) delete output['.css'];

      return output;
    },
  };
};
