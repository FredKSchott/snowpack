import {Service, startService} from 'esbuild';
import * as colors from 'kleur/colors';
import path from 'path';
import {SnowpackPluginBuildResult} from '../config';
import {checkIsPreact} from './build-util';

let esbuildService: Service | null = null;

export function esbuildPlugin() {
  return {
    async build({contents, filePath}) {
      esbuildService = esbuildService || (await startService());
      const isPreact = checkIsPreact(filePath, contents);
      const {js, warnings} = await esbuildService!.transform(contents, {
        loader: path.extname(filePath).substr(1) as 'jsx' | 'ts' | 'tsx',
        jsxFactory: isPreact ? 'h' : undefined,
        jsxFragment: isPreact ? 'Fragment' : undefined,
      });
      for (const warning of warnings) {
        console.error(colors.bold('! ') + filePath);
        console.error('  ' + warning.text);
      }
      return {result: js || ''} as SnowpackPluginBuildResult;
    },
  };
}

export function stopEsbuild() {
  esbuildService && esbuildService.stop();
}
