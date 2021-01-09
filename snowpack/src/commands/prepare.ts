import {CommandOptions} from '../types';
import {getPackageSource} from '../util';

export async function command(commandOptions: CommandOptions) {
  const {config} = commandOptions;
  const pkgSource = getPackageSource(config.packageOptions.source);
  await pkgSource.prepare(commandOptions);
}
