import {CommandOptions} from '../types';
import {getPackageSource} from '../util';

export async function command(commandOptions: CommandOptions) {
  const {config} = commandOptions;
  const pkgSource = getPackageSource(config.packages.source);
  await pkgSource.prepare(commandOptions);
}
