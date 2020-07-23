import {promises as fs} from 'fs';
import got from 'got';
import path from 'path';
import {CommandOptions} from '../util';
import {command as installCommand} from './install';

export async function addCommand(addValue: string, commandOptions: CommandOptions) {
  const {cwd, config, pkgManifest} = commandOptions;
  let [pkgName, pkgSemver] = addValue.split('@');
  if (!pkgSemver) {
    const body = (await got(`http://registry.npmjs.org/${pkgName}/latest`).json()) as any;
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
