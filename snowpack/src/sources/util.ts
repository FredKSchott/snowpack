import {PackageSource, SnowpackConfig} from '../types';
import {PackageSourceLocal} from './local';
import {PackageSourceRemote} from './remote';

export async function clearCache() {
  return Promise.all([PackageSourceLocal.clearCache(), PackageSourceRemote.clearCache()]);
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
