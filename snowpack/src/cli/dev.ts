import {fileURLToPath} from 'url';
import type {InitConfig} from '../@types/snowpack';
import {createServer} from '../dev';

interface DevOptions {
  config: InitConfig;
  cwd: URL;
}

export default async function dev({config, cwd}: DevOptions) {
  const devServer = await createServer({config, cwd: fileURLToPath(cwd)});
  await devServer.listen(config.devOptions.port);
}
