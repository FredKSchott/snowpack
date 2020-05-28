import {Service, startService} from 'esbuild';
import path from 'path';
import {checkIsPreact} from './build-util';
import {SnowpackPluginBuildResult} from '../config';
import chalk from 'chalk';

let esbuildService: Service | null = null;

export function esbuildPlugin() {
  return {
    async build({contents, filePath, isDev}) {
      esbuildService = esbuildService || (await startService());
      const isPreact = checkIsPreact(filePath, contents);
      const {js, warnings} = await esbuildService!.transform(contents, {
        loader: path.extname(filePath).substr(1) as 'jsx' | 'ts' | 'tsx',
        sourcemap: isDev && 'inline',
        jsxFactory: isPreact ? 'h' : undefined,
        jsxFragment: isPreact ? 'Fragment' : undefined,
      });
      for (const warning of warnings) {
        console.error(chalk.bold('! ') + filePath);
        console.error('  ' + warning.text);
      }
      return {result: js || ''} as SnowpackPluginBuildResult;
    },
  };
}

export function stopEsbuild() {
  esbuildService && esbuildService.stop();
}
