import {promises as fs, existsSync, constants as fsConstants} from 'fs';
import {bold, dim} from 'kleur/colors';
import path from 'path';
import {logger} from '../logger';
import {CommandOptions} from '../types';
import {INIT_TEMPLATE_FILENAME} from '../util';

export async function command(commandOptions: CommandOptions) {
  const {config} = commandOptions;
  logger.info(`Creating new project configuration file... ${dim('(snowpack.config.js)')}`);
  const destLoc = path.join(config.root, 'snowpack.config.js');
  if (existsSync(destLoc)) {
    logger.error(`Error: File already exists, cannot overwrite ${destLoc}`);
    process.exit(1);
  }
  await fs.copyFile(INIT_TEMPLATE_FILENAME, destLoc, fsConstants.COPYFILE_EXCL);
  logger.info(`File created! Open ${bold('snowpack.config.js')} to customize your project.`);
}
