import {promises as fs, existsSync, constants as fsConstants} from 'fs';
import {bold, dim} from 'kleur/colors';
import path from 'path';
import {logger} from '../logger';
import {CommandOptions} from '../types/snowpack';

export async function command(commandOptions: CommandOptions) {
  const {cwd} = commandOptions;
  logger.info(`Creating new project configuration file... ${dim('(snowpack.config.js)')}`);
  const templateLoc = path.join(__dirname, '../../assets/snowpack-init-file.js');
  const destLoc = path.join(cwd, 'snowpack.config.js');
  if (existsSync(destLoc)) {
    logger.error(`Error: File already exists, cannot overwrite ${destLoc}`);
    process.exit(1);
  }
  await fs.copyFile(templateLoc, destLoc, fsConstants.COPYFILE_EXCL);
  logger.info(`File created! Open ${bold('snowpack.config.js')} to customize your project.`);
}
