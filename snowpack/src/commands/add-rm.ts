import {send} from 'httpie';
import {cyan, dim, underline} from 'kleur/colors';
import path from 'path';
import {promises as fs} from 'fs';
import {generateImportMap} from 'skypack';
import {logger} from '../logger';
import {CommandOptions} from '../types/snowpack';
import {writeLockfile} from '../util';

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, config, lockfile, pkgManifest} = commandOptions;
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
  pkgManifest.webDependencies = pkgManifest.webDependencies || {};
  pkgManifest.webDependencies[pkgName] = pkgSemver;
  config.webDependencies = config.webDependencies || {};
  config.webDependencies[pkgName] = pkgSemver;
  delete pkgManifest.dependencies[pkgName];
  delete pkgManifest.devDependencies[pkgName];
  await fs.writeFile(path.join(cwd, 'package.json'), JSON.stringify(pkgManifest, null, 2));
  logger.info(`Added "${pkgName}@${pkgSemver}" to package.json web dependencies.`);
  logger.info(`Regenerating lockfile...`);
  const newLockfile = await generateImportMap({[pkgName]: pkgSemver}, lockfile || undefined);
  await writeLockfile(path.join(cwd, 'snowpack.lock.json'), newLockfile);
}

export async function rmCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, pkgManifest, config, lockfile} = commandOptions;
  let [pkgName] = addValue.split('@');
  logger.info(`removing ${cyan(pkgName)} from project lockfile...`);
  pkgManifest.webDependencies = pkgManifest.webDependencies || {};
  delete pkgManifest.webDependencies[pkgName];
  config.webDependencies = config.webDependencies || {};
  delete config.webDependencies[pkgName];
  await fs.writeFile(path.join(cwd, 'package.json'), JSON.stringify(pkgManifest, null, 2));
  const newLockfile = await generateImportMap({[pkgName]: null}, lockfile || undefined);
  await writeLockfile(path.join(cwd, 'snowpack.lock.json'), newLockfile);
}
