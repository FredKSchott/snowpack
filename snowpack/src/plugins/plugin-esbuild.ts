import {Service, startService} from 'esbuild';
import * as colors from 'kleur/colors';
import path from 'path';
import {promises as fs} from 'fs';
import {SnowpackPlugin, SnowpackConfig} from '../types/snowpack';
import {logger} from '../logger';

let esbuildService: Service | null = null;

const IS_PREACT = /from\s+['"]preact['"]/;
function checkIsPreact(filePath: string, contents: string) {
  return (filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) && IS_PREACT.test(contents);
}

function getLoader(filePath: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  const ext = path.extname(filePath);
  if (ext === '.mjs') {
    return 'js';
  }
  return ext.substr(1) as 'jsx' | 'ts' | 'tsx';
}

export function esbuildPlugin(config: SnowpackConfig, {input}: {input: string[]}): SnowpackPlugin {
  return {
    name: '@snowpack/plugin-esbuild',
    resolve: {
      input,
      output: ['.js'],
    },
    async load({filePath}) {
      esbuildService = esbuildService || (await startService());
      const contents = await fs.readFile(filePath, 'utf-8');
      const isPreact = checkIsPreact(filePath, contents);
      const {code, map, warnings} = await esbuildService!.transform(contents, {
        loader: getLoader(filePath),
        jsxFactory: isPreact ? 'h' : undefined,
        jsxFragment: isPreact ? 'Fragment' : undefined,
        sourcefile: filePath,
        sourcemap: config.buildOptions.sourceMaps,
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
    cleanup() {
      esbuildService && esbuildService.stop();
    },
  };
}
