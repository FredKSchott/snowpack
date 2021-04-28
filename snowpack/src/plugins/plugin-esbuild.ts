import * as esbuild from 'esbuild';
import * as colors from 'kleur/colors';
import path from 'path';
import {promises as fs} from 'fs';
import {SnowpackPlugin, SnowpackConfig} from '../types';
import {logger} from '../logger';

const IS_PREACT = /from\s+['"]preact['"]/;
function checkIsPreact(contents: string) {
  return IS_PREACT.test(contents);
}

type Loader = 'js' | 'jsx' | 'ts' | 'tsx';

function getLoader(filePath: string): {loader: Loader; isJSX: boolean} {
  const ext = path.extname(filePath);
  const loader: Loader = ext === '.mjs' ? 'js' : (ext.substr(1) as Loader);
  const isJSX = loader.endsWith('x');
  return {loader, isJSX};
}

export function esbuildPlugin(config: SnowpackConfig, {input}: {input: string[]}): SnowpackPlugin {
  return {
    name: '@snowpack/plugin-esbuild',
    resolve: {
      input,
      output: ['.js'],
    },
    async load({filePath}) {
      let contents = await fs.readFile(filePath, 'utf8');
      const {loader, isJSX} = getLoader(filePath);
      if (isJSX) {
        const jsxInject = config.buildOptions.jsxInject ? `${config.buildOptions.jsxInject}\n` : '';
        contents = jsxInject + contents;
      }
      const isPreact = isJSX && checkIsPreact(contents);
      let jsxFactory = config.buildOptions.jsxFactory ?? (isPreact ? 'h' : undefined);
      let jsxFragment = config.buildOptions.jsxFragment ?? (isPreact ? 'Fragment' : undefined);

      const {code, map, warnings} = await esbuild.transform(contents, {
        loader: loader,
        jsxFactory,
        jsxFragment,
        sourcefile: filePath,
        sourcemap: config.buildOptions.sourcemap && 'inline',
        charset: 'utf8',
      });
      for (const warning of warnings) {
        logger.error(`${colors.bold('!')} ${filePath}
  ${warning.text}`);
      }
      return {
        '.js': {
          code: code || '',
          map,
        },
      };
    },
    cleanup() {},
  };
}
