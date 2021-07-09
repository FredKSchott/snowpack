import mime from 'mime-types';
import {BinaryFile, LoadResult, StringFile} from '../@types/snowpack';
import {ext} from '../core/util/filename';

export class AssetCache {
  private cache = new Map<string, StringFile | BinaryFile>();

  entries() {
    return this.cache.entries();
  }

  set(id: string, asset: StringFile | BinaryFile) {
    return this.cache.set(id, asset);
  }

  has(id: string) {
    return this.cache.has(id);
  }

  get(id: string) {
    return this.cache.get(id);
  }

  delete(id: string) {
    return this.cache.delete(id);
  }
}

interface ExtractAssetOptions {
  cache: AssetCache;
  onUpdate(id: string): void;
  url: string;
}

export function extractAssets(
  result: LoadResult | undefined,
  {cache, onUpdate, url}: ExtractAssetOptions,
) {
  if (!result || !result.assets || !result.assets.length) return;

  for (const asset of result.assets) {
    const urlExt = ext(url);
    const assetExt = mime.extension(asset.contentType) || '';
    let id = url.replace(new RegExp(`${urlExt}$`), assetExt ? `.${assetExt}` : '');
    const cached = cache.get(id);

    // if this is in cache, only mark update if it’s changed
    if (cached) {
      // string file hasn’t changed
      if (asset.encoding && cached.content === asset.content) return;
      // binary file hasn’t changed
      else if (!asset.encoding && Buffer.compare(cached.content as Buffer, asset.content) === 0)
        return;
    }

    // mark update
    cache.set(id, asset);
    onUpdate(id);
  }
}
