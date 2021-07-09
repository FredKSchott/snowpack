import http from 'http';
import {EventEmitter} from 'stream';
import {Config, DevServer} from '../@types/snowpack';
import {createRuntime} from '../core';
import {createConfig} from '../core/config';
import {HTML} from '../core/util/content-type';
import {AssetCache, extractAssets} from './assets';
import {ESMHMREngine} from './hmr';
import {inject} from './inject';

interface ServerOptions {
  config?: Config;
  cwd?: string;
}

export async function createServer(options: ServerOptions): Promise<DevServer> {
  let cwd = new URL(`file://${process.cwd()}/`);
  if (options.cwd) cwd = new URL(options.cwd, cwd);
  const config = createConfig(options.config);
  const runtime = await createRuntime({config, cwd});

  const server = http.createServer(handleRequest);
  const hmr = new ESMHMREngine({
    server,
    port: config.devOptions.hmrPort,
    delay: config.devOptions.hmrDelay,
  });
  const emitter = new EventEmitter();
  const assetCache = new AssetCache();

  async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    let url = req.url || '/';
    if (url.endsWith('/')) url += 'index.html'; // try loading HTML if accessing folder
    try {
      // 1. load response
      const result = await runtime.load(url);

      // 2. extract assets (if any) to cache
      extractAssets(result, {
        cache: assetCache,
        url,
        onUpdate(id) {
          hmr.broadcastMessage({type: 'reload'});
        },
      });

      // 3. return response
      if (result) {
        //  inject dev server response with assets, HMR, etc. etc.
        inject({url, cache: assetCache, hmr, result});

        emitter.emit('found', url);
        res.writeHead(200, {'Content-Type': result.data.contentType});
        res.write(result.data.content);
        res.end();
        return;
      }
      emitter.emit('not-found', url);
      res.writeHead(404, {'Content-Type': HTML});
      res.write(`Not found: "${req.url}"`);
      res.end();
    } catch (err) {
      emitter.emit('error', err);
      console.error(err);
      res.writeHead(500, {'Content-Type': HTML});
      res.write(err.toString());
      res.end();
    }
  }

  return {
    async listen(port) {
      server.listen(port);
      console.log(`Live at http://localhost:${port}`);
      await new Promise(() => {});
    },
    on: emitter,
    async stop() {
      hmr.disconnectAllClients();
      server.close();
      await hmr.stop();
    },
  };
}
