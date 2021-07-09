import cheerio from 'cheerio';
import {LoadResult} from '../@types/snowpack';
import type {AssetCache} from './assets';
import type {ESMHMREngine} from './hmr';

interface InjectOptions {
  cache: AssetCache;
  hmr: ESMHMREngine;
  result: LoadResult;
  url: string;
}

/** modify a dev server response before sending to client */
export async function inject({cache, hmr, result, url}: InjectOptions): Promise<void> {
  const [contentType] = result.data.contentType.split(';');

  switch (contentType) {
    // html
    case 'text/html': {
      // 1. inject assets
      const $ = cheerio.load(result.data.content);
      for (const [k, v] of cache.entries()) {
        // asset: css
        console.log(v.contentType);
        if (v.contentType.startsWith('text/css')) {
          const tag = $(`link[href="${k}"]`);
          if (tag && tag.length) continue;
          $('head').append(`<link rel="stylesheet" type="text/css" href="${k}">`);
        }
      }

      // 2. add HMR code (TODO)

      // 3. mark update
      const newHTML = $.html();
      if (result.data.content !== newHTML) {
        result.data.content = newHTML;
        hmr.broadcastMessage({type: 'update', url, bubbled: false});
      }
      break;
    }
  }
}
