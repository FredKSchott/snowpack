import {send} from 'httpie';
import {cyan, dim, underline} from 'kleur/colors';
import path from 'path';
import {logger} from '../logger';
import {CommandOptions, LockfileManifest} from '../types';
import {
  convertLockfileToSkypackImportMap,
  convertSkypackImportMapToLockfile,
  LOCKFILE_NAME,
  writeLockfile,
  createRemotePackageSDK,
} from '../util';
import {getPackageSource} from '../sources/util';

function pkgInfoFromString(str) {
  const idx = str.lastIndexOf('@');
  if (idx <= 0) return [str];
  return [str.slice(0, idx), str.slice(idx + 1)];
}

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  if (config.packageOptions.source === 'remote-next') {
    throw new Error(
      `[remote-next] add command has been deprecated. Manually add dependencies to the "dependencies" object in your snowpack config file.`,
    );
  }
  if (config.packageOptions.source !== 'remote') {
    throw new Error(`add command requires packageOptions.source="remote".`);
  }
  const remotePackageSDK = createRemotePackageSDK(config);
  let [pkgName, pkgSemver] = pkgInfoFromString(addValue);
  const installMessage = pkgSemver ? `${pkgName}@${pkgSemver}` : pkgName;
  logger.info(`fetching ${cyan(installMessage)} from CDN...`);
  if (!pkgSemver || pkgSemver === 'latest') {
    const {data} = await send('GET', `http://registry.npmjs.org/${pkgName}/latest`);
    pkgSemver = `^${data.version}`;
  }
  logger.info(
    `adding ${cyan(underline(`${pkgName}@${pkgSemver}`))} to your project lockfile. ${dim(
      `(${LOCKFILE_NAME})`,
    )}`,
  );
  const addedDependency = {[pkgName]: pkgSemver};
  const lookupResponse = await remotePackageSDK.lookupBySpecifier(pkgName, pkgSemver);
  if (lookupResponse.error) {
    throw new Error(`There was a problem looking up ${pkgName}@${pkgSemver}`);
  }
  const newLockfile: LockfileManifest = convertSkypackImportMapToLockfile(
    {
      ...lockfile?.dependencies,
      ...addedDependency,
    },
    await remotePackageSDK.generateImportMap(
      addedDependency,
      lockfile
        ? convertLockfileToSkypackImportMap(config.packageOptions.origin, lockfile)
        : undefined,
    ),
  );
  await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
  await getPackageSource(config).prepare();
}

export async function rmCommand(addValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  if (config.packageOptions.source === 'remote-next') {
    throw new Error(
      `[remote-next] rm command has been deprecated. Manually remove dependencies from the "dependencies" object in your snowpack config file.`,
    );
  }
  if (config.packageOptions.source !== 'remote') {
    throw new Error(`rm command requires packageOptions.source="remote".`);
  }
  const remotePackageSDK = createRemotePackageSDK(config);
  let [pkgName] = pkgInfoFromString(addValue);
  logger.info(`removing ${cyan(pkgName)} from project lockfile...`);
  const newLockfile: LockfileManifest = convertSkypackImportMapToLockfile(
    lockfile?.dependencies ?? {},
    await remotePackageSDK.generateImportMap(
      {[pkgName]: null},
      lockfile
        ? convertLockfileToSkypackImportMap(config.packageOptions.origin, lockfile)
        : undefined,
    ),
  );
  delete newLockfile.dependencies[pkgName];
  await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
  await getPackageSource(config).prepare();
}
