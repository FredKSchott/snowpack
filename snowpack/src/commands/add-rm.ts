import {send} from 'httpie';
import {cyan, dim, underline} from 'kleur/colors';
import path from 'path';
import {logger} from '../logger';
import {CommandOptions, LockfileManifest, PackageOptionsRemote} from '../types';
import {
  convertLockfileToSkypackImportMap,
  convertSkypackImportMapToLockfile,
  LOCKFILE_NAME,
  writeLockfile,
  remotePackageSDK,
  readLockfile,
} from '../util';
import {getPackageSource} from '../sources/util';

function pkgInfoFromString(str) {
  const idx = str.lastIndexOf('@');
  if (idx <= 0) return [str];
  return [str.slice(0, idx), str.slice(idx + 1)];
}

export async function addCommandLegacy(addValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  const packageOptions = config.packageOptions as PackageOptionsRemote;
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
      lockfile ? convertLockfileToSkypackImportMap(packageOptions.origin, lockfile) : undefined,
    ),
  );
  await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
  await getPackageSource(config).prepare();
}

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  if (config.packageOptions.source === 'remote') {
    return addCommandLegacy(addValue, commandOptions);
  }
  if (config.packageOptions.source === 'local') {
    throw new Error(`"snowpack add" only works when "packageOptions.source" is set.`);
  }
  let [pkgName, pkgSemver] = pkgInfoFromString(addValue);
  if (!pkgSemver || pkgSemver === 'latest') {
    const {data} = await send('GET', `http://registry.npmjs.org/${pkgName}/latest`);
    pkgSemver = `^${data.version}`;
  }
  logger.info(
    `adding ${cyan(underline(`${pkgName}@${pkgSemver}`))} to your project lockfile. ${dim(
      `(${LOCKFILE_NAME})`,
    )}`,
  );
  const newLockfile: LockfileManifest = {
    dependencies: {
      ...(lockfile ? lockfile.dependencies : {}),
      [pkgName]: pkgSemver,
    },
    lock: lockfile ? lockfile.lock : {},
  };
  await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
  await getPackageSource(config).prepare();
}

async function rmCommandLegacy(rmValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  const packageOptions = config.packageOptions as PackageOptionsRemote;
  let [pkgName] = pkgInfoFromString(rmValue);
  logger.info(`removing ${cyan(pkgName)} from project lockfile...`);
  const newLockfile: LockfileManifest = convertSkypackImportMapToLockfile(
    lockfile?.dependencies ?? {},
    await remotePackageSDK.generateImportMap(
      {[pkgName]: null},
      lockfile ? convertLockfileToSkypackImportMap(packageOptions.origin, lockfile) : undefined,
    ),
  );
  delete newLockfile.dependencies[pkgName];
  await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
  await getPackageSource(config).prepare();
}

export async function rmCommand(rmValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  if (config.packageOptions.source === 'remote') {
    return rmCommandLegacy(rmValue, commandOptions);
  }
  if (config.packageOptions.source === 'local') {
    throw new Error(`"snowpack rm" only works when "packageOptions.source" is set.`);
  }
  let [pkgName] = pkgInfoFromString(rmValue);
  logger.info(`removing ${cyan(pkgName)} from project lockfile...`);

  const newLockfile: LockfileManifest = {
    dependencies: {...(lockfile ? lockfile.dependencies : {})},
    lock: lockfile ? lockfile.lock : {},
  };
  delete newLockfile.dependencies[pkgName];
  await writeLockfile(path.join(config.root, LOCKFILE_NAME), newLockfile);
  await getPackageSource(config).prepare();

  const newLockfileAfterPrepare = await readLockfile(config.root);
  if (newLockfileAfterPrepare?.dependencies[pkgName]) {
    throw new Error(
      `Tried to remove dependency ${cyan(pkgName)}, but its still used within your project.`,
    );
  }
}
