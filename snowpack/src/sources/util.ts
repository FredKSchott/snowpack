import {PackageSource, SnowpackConfig} from '../types';
import {PackageSourceLocal} from './local';
import {PackageSourceRemote} from './remote';
import {PackageSourceV4} from './v4';
import path from 'path';
import del from 'del';

export async function clearCache() {
  return Promise.all([
    PackageSourceRemote.clearCache(),
    // NOTE(v4.0): This function is called before config has been created.
    // But, when `packageOptions.source="remote-next"` the ".snowpack" cache
    // directory lives in the config.root directory. We fake it here,
    // and can revisit this API (probably add config as an arg) in v4.0.
    del(path.join(process.cwd(), '.snowpack')),
    del(path.join(process.cwd(), 'node_modules', '.cache', 'snowpack')),
  ]);
}

const sourceCache: Record<string, WeakMap<SnowpackConfig, PackageSource>> = {};

export function getPackageSource(config: SnowpackConfig): PackageSource {
  const sourceName = config.packageOptions.source;

  // if package source is already cached, use that
  if (typeof sourceName === 'string') {
    if (!sourceCache[sourceName])
      sourceCache[sourceName] = new WeakMap<SnowpackConfig, PackageSource>();
    if (sourceCache[sourceName].has(config)) return sourceCache[sourceName].get(config) as any;
  }

  switch (sourceName) {
    case 'remote': {
      const source = new PackageSourceRemote(config);
      sourceCache[sourceName].set(config, source);
      return source;
    }
    case 'v4': {
      const source = new PackageSourceV4(config);
      sourceCache[sourceName].set(config, source);
      return source;
    }
    case 'local':
    default: {
      const source = new PackageSourceLocal(config);
      if (typeof sourceName === 'string') sourceCache[sourceName].set(config, source);
      return source;
    }
  }
}
