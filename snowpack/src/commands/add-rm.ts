import {send} from 'httpie';
import {cyan, dim, underline} from 'kleur/colors';
import path from 'path';
import {generateImportMap} from 'skypack';
import {logger} from '../logger';
import {CommandOptions} from '../types/snowpack';
import {writeLockfile} from '../util';

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, lockfile} = commandOptions;
  let [pkgName, pkgSemver] = addValue.split('@');
  const installMessage = pkgSemver ? `${pkgName}@${pkgSemver}` : pkgName;
  logger.info(`fetching ${cyan(installMessage)} from Skypack CDN...`);
  if (!pkgSemver || pkgSemver === 'latest') {
    const {data} = await send('GET', `http://registry.npmjs.org/${pkgName}/latest`);
    pkgSemver = `^${data.version}`;
  }
  logger.info(
    `adding ${cyan(
      underline(`https://cdn.skypack.dev/${pkgName}@${pkgSemver}`),
    )} to your project lockfile. ${dim('(snowpack.lock.json)')}`,
  );
  const newLockfile = await generateImportMap({[pkgName]: pkgSemver}, lockfile || undefined);
  await writeLockfile(path.join(cwd, 'snowpack.lock.json'), newLockfile);
}

export async function rmCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, lockfile} = commandOptions;
  let [pkgName] = addValue.split('@');
  logger.info(`removing ${cyan(pkgName)} from project lockfile...`);
  const newLockfile = await generateImportMap({[pkgName]: null}, lockfile || undefined);
  await writeLockfile(path.join(cwd, 'snowpack.lock.json'), newLockfile);
}
