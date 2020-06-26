import {Service, startService} from 'esbuild';
import * as colors from 'kleur/colors';
import path from 'path';

let esbuildService: Service | null = null;

// Note: duplicated here to avoid circular dep
export interface SnowpackPlugin {
  name: string;
  input: string | string[];
  output: string | string[];
  build?(BuildOptions): Promise<Record<string, string>>;
}
const IS_PREACT = /from\s+['"]preact['"]/;
export function checkIsPreact(filePath: string, contents: string) {
  return filePath.endsWith('.jsx') && IS_PREACT.test(contents);
}

export function esbuildPlugin(): SnowpackPlugin {
  return {
    name: '@snowpack/plugin-esbuild',
    input: ['.js', '.jsx', '.ts', '.tsx'],
    output: '.js',
    async build({code, filePath}) {
      esbuildService = esbuildService || (await startService());
      const isPreact = checkIsPreact(filePath, code);
      const {js, warnings} = await esbuildService!.transform(code, {
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
