import * as colors from 'kleur/colors';
import {logger} from '../logger';
import {CommandOptions} from '../types';
import {getPackageSource} from '../util';

export async function command(commandOptions: CommandOptions) {
  const {config, lockfile} = commandOptions;
  logger.info(colors.yellow('! preparing your project...'));
  if (config.packageOptions.source === 'remote') {
    if (!config.packageOptions.types) {
      logger.info(
        colors.green('✔') +
          ' nothing to prepare. ' +
          colors.dim(
            '(if using TypeScript, set `packageOptions.types=true` to fetch package TypeScript types ahead-of-time.)',
          ),
      );
      return;
    }
    if (!lockfile) {
      logger.info(
        colors.yellow(
          '! no dependencies found. run "snowpack add [package]" to add a dependencies to your project.',
        ),
      );
      return;
    }
  }
  const pkgSource = getPackageSource(config.packageOptions.source);
  await pkgSource.prepare(commandOptions);
  logger.info(colors.green('✔') + ' project ready!');
}
