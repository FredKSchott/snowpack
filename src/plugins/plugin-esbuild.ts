import {Service, startService} from 'esbuild';
import * as colors from 'kleur/colors';
import path from 'path';

let esbuildService: Service | null = null;

const IS_PREACT = /from\s+['"]preact['"]/;
export function checkIsPreact(filePath: string, contents: string) {
  return filePath.endsWith('.jsx') && IS_PREACT.test(contents);
}

export function esbuildPlugin({input}: {input: string[]}) {
  return {
    name: '@snowpack/plugin-esbuild',
    input,
    output: ['.js'],
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
      return {'.js': js || ''};
    },
  };
}

export function stopEsbuild() {
  esbuildService && esbuildService.stop();
}
