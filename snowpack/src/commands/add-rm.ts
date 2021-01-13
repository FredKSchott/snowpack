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
  remotePackageSDK,
} from '../util';
import remotePackageSource from '../sources/remote';

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  if (config.packageOptions.source !== 'remote') {
    throw new Error(`add command requires packageOptions.source="remote".`);
  }
  let [pkgName, pkgSemver] = addValue.split('@');
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
  await remotePackageSource.prepare(commandOptions);
}

export async function rmCommand(addValue: string, commandOptions: CommandOptions) {
  const {lockfile, config} = commandOptions;
  if (config.packageOptions.source !== 'remote') {
    throw new Error(`rm command requires packageOptions.source="remote".`);
  }
  let [pkgName] = addValue.split('@');
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
  await remotePackageSource.prepare(commandOptions);
}
