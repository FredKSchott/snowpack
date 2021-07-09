import type {InitConfig} from '../@types/snowpack';

interface BuildOptions {
  config: InitConfig;
  cwd: URL;
}
export default async function build({config, cwd}: BuildOptions) {}
