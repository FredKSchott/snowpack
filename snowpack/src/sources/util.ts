import {PackageSource, SnowpackConfig} from '../types';
import {PackageSourceLocal} from './local';
import {PackageSourceRemote} from './remote';
import path from 'path';
import rimraf from 'rimraf';

export async function clearCache() {
  return Promise.all([
    PackageSourceRemote.clearCache(),
    // NOTE(v4.0): This function is called before config has been created.
    // But, when `packageOptions.source="remote-next"` the ".snowpack" cache
    // directory lives in the config.root directory. We fake it here,
    // and can revisit this API (probably add config as an arg) in v4.0.
    rimraf.sync(path.join(process.cwd(), '.snowpack')),
    rimraf.sync(path.join(process.cwd(), 'node_modules', '.cache', 'snowpack')),
  ]);
}

/**
 * Previously, all PackageSources were global. The new PackageSourceLocal is designed
 * to allow for uniqueness across projects / Snowpack instances. That support will come later,
 * so for now we just keep a global instance here.
 */
let sharedPackageSourceLocal: PackageSourceLocal | undefined;
let sharedPackageSourceRemote: PackageSourceRemote | undefined;

export function getPackageSource(config: SnowpackConfig): PackageSource {
  if (config.packageOptions.source === 'remote') {
    sharedPackageSourceRemote = sharedPackageSourceRemote || new PackageSourceRemote(config);
    return sharedPackageSourceRemote;
  }
  sharedPackageSourceLocal = sharedPackageSourceLocal || new PackageSourceLocal(config);
  return sharedPackageSourceLocal;
}
