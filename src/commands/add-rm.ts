import {promises as fs} from 'fs';
import bent from 'bent';
import path from 'path';
import {CommandOptions} from '../util';
import {command as installCommand} from './install';

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, config, pkgManifest} = commandOptions;
  let [pkgName, pkgSemver] = addValue.split('@');
  if (!pkgSemver) {
    const getJson = bent('https://registry.npmjs.org', 'json', 200);
    const body = await getJson(`${pkgName}/latest`) as { version: string };
    pkgSemver = `^${body.version}`;
  }
  pkgManifest.webDependencies = pkgManifest.webDependencies || {};
  pkgManifest.webDependencies[pkgName] = pkgSemver;
  config.webDependencies = config.webDependencies || {};
  config.webDependencies[pkgName] = pkgSemver;
  await fs.writeFile(path.join(cwd, 'package.json'), JSON.stringify(pkgManifest, null, 2));
  await installCommand(commandOptions);
}

export async function rmCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, config, pkgManifest} = commandOptions;
  let [pkgName] = addValue.split('@');
  pkgManifest.webDependencies = pkgManifest.webDependencies || {};
  delete pkgManifest.webDependencies[pkgName];
  config.webDependencies = config.webDependencies || {};
  delete config.webDependencies[pkgName];
  await fs.writeFile(path.join(cwd, 'package.json'), JSON.stringify(pkgManifest, null, 2));
  await installCommand(commandOptions);
}
